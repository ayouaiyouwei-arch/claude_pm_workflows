export const meta = {
  name: 'gen-cases-spec',
  description: '目标态/方案文档 验收用例生成(schema v2 19列·闭环驱动·G2对抗复核)。与现状 gen-cases 区别：覆盖义务分母来自【方案文档】(非 modules 01/03/04/06)，可追溯字段(fe_ref/diff_ref/chg_ref)默认留空，引证=复用现状引码@SHA+纯目标态引源文档§/线框W/AC。用于 _drafts/ 目标态方案(代码尚未实现)产用例；调用方过 G1 lint(--dir)写盘到 _drafts/.../验收用例/，将来功能上线再回流 test-cases。args={root,codeRoot,sha,docs:[{prefix,name,docPaths:[相对root],start,obligations?}]}',
  phases: [
    { title: 'Generate', detail: '逐分块 doc-grounded 闭环生成 + 结构化覆盖义务矩阵(S1)' },
    { title: 'SelfReview', detail: 'G2 对抗复核(引证=码@SHA或源文档/逻辑/覆盖)' },
    { title: 'AutoFix', detail: '对 mustFix 命中用例定点重写(S2)·按裁定note修·其余原样' },
  ],
}

// 项目无关：root/sha 由调用方注入；codeRoot 默认 root/code
// 健壮性：args 可能以 JSON 字符串形式传入(命名工作流+大对象场景)，统一解析为对象
let A = args || {}
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = {} } }
const ROOT = A.root
const CODE = A.codeRoot || (ROOT && ROOT + '/code')
const SHA = A.sha || 'HEAD'
const DOCS = A.docs || []
if (!ROOT || !DOCS.length) {
  log('⚠ gen-cases-spec：需传 args.root(工作空间绝对路径) + args.docs([{prefix:"TC-<ABBR>",name,docPaths:["相对root的方案文档路径"...],start:"TC-<ABBR>-001",obligations?}])；codeRoot/sha 可选(默认 root/code 与 HEAD)。返回空。')
  return { groups: [], note: 'missing args.root or args.docs' }
}

const CASE_FIELDS = ['case_id','module','page','route','fe_ref','diff_ref','chg_ref','baseline_version','priority','scenario','preconditions','steps','expected','five_states','evidence_required','automation_type','automation_path','owner','last_updated']

const FORMAT = `
【输出=验收用例 CSV 行，schema v2 共 19 字段，顺序固定】
case_id,module,page,route,fe_ref,diff_ref,chg_ref,baseline_version,priority,scenario,preconditions,steps,expected,five_states,evidence_required,automation_type,automation_path,owner,last_updated
铁律(违反=作废)：
- ⚠️【CSV完整性·最高优先】任何字段值内严禁英文逗号 ,（用中文逗号，或顿号、）；字段内零英文逗号；steps/expected 内若需换行用字面量 \\n(两字符 反斜杠+n)，严禁真实换行。
- scenario 以方法标签开头 [EC]/[BV]/[DT]/[SC]/[EG]/[ST] 可组合；句式「<角色> <动作> <对象>，校验<断言>（<关键预期>）」≤120字。
- steps 多步用 \\n 从 1) 起；expected 与之对齐。多值字段(fe_ref/diff_ref/chg_ref/five_states/evidence_required)内部用英文分号 ;。
- five_states 选 loading;empty;error;success;permission，不适用写 na；失败/越权/异常务必显式含 error 或 permission，勿全 na。
- 【目标态专属】baseline_version 固定写 目标态；automation_type=manual；automation_path=na；owner=PM；last_updated 用调用方给的日期。
- 【目标态可追溯】fe_ref/diff_ref/chg_ref 默认全部留空(目标态尚无现状 FE/基线)；仅当本用例确实复用现状且对应真实台账编号(如 DIFF-003)时才填，编不出就留空，绝不写不存在的编号。
- 【引证两类】① 复用现状行为的用例(如自动保存/断点续跑/草稿恢复)：steps/expected 引现状 文件:行号 @ ${SHA}(到 ${CODE} 可核)。② 纯目标态新行为：引「源文档 §x / 线框 Wx / AC-x」等方案出处，不编造代码行号、不把未实现功能写成"现状已有"。
- case_id 从指定起号连续递增、零跳号、前缀用调用方给的 prefix。`

const CASE_SCHEMA = {
  type:'object', required:['cases','obligations','notes'],
  properties:{
    cases:{type:'array',items:{type:'object',required:CASE_FIELDS,
      properties:Object.fromEntries(CASE_FIELDS.map(k=>[k,{type:'string'}]))}},
    // S1：结构化覆盖义务矩阵(分母)——取代自由文本闭环自检，供 lint --obligations 机器门校验
    obligations:{type:'array',description:'本文档覆盖义务清单(分母)，每条义务→覆盖状态',
      items:{type:'object',required:['source','id','desc','status'],properties:{
        source:{type:'string',description:'义务来源:功能点/W区/状态机/红线/复用现状/三角色/空态/异常/验收点'},
        id:{type:'string',description:'义务编号(如 W2 / 红线3 / FP-03 / 状态:草稿→审核中)'},
        desc:{type:'string',description:'义务一句话'},
        status:{type:'string',description:'覆盖状态:命中的 case_id(多条用;分隔) 或 "未覆盖" 或 "有意不测:理由"'}}}},
    notes:{type:'string',description:'生成说明(覆盖闭环结论一句话)'}
  }
}
const FIX_SCHEMA = {
  type:'object', required:['cases'],
  properties:{ cases:{type:'array',description:'仅被修正的用例(corrected versions·只含 mustFix 命中条)',
    items:{type:'object',required:CASE_FIELDS,properties:Object.fromEntries(CASE_FIELDS.map(k=>[k,{type:'string'}]))}} }
}
const REVIEW_SCHEMA = {
  type:'object', required:['doc','verdicts','mustFix'],
  properties:{
    doc:{type:'string'},
    verdicts:{type:'array',items:{type:'object',required:['case_id','citation','logic','coverage','severity','note'],properties:{
      case_id:{type:'string'},
      citation:{type:'string',enum:['ok','wrong','unverifiable','no-citation']},
      logic:{type:'string',enum:['sound','flawed','dubious']},
      coverage:{type:'string',enum:['real','partial','superficial']},
      severity:{type:'string',enum:['none','low','med','high']},
      note:{type:'string'}}}},
    mustFix:{type:'array',items:{type:'string'},description:'severity=med/high 必修的 case_id'}
  }
}

phase('Generate')

const groups = await pipeline(
  DOCS,
  // 阶段1：闭环驱动生成（义务分母来自方案文档）
  (d) => agent(
`为【目标态方案文档】「${d.name}」生成验收用例(测试专家·doc-grounded·闭环驱动)。这是目标态(代码尚未实现)产品方案，只读文档。
必读(相对 ${ROOT})：${d.docPaths.join('、')}；以及总纲(全局红线 §五·术语 §六)同目录 00-产品架构设计总纲.md；复用现状交互处另查对应 modules/ 现状文档与代码快照 ${CODE}(@ ${SHA})作引证。
case_id 从 ${d.start} 起连续编号、零跳号、前缀 ${d.prefix}。
⚠️【闭环驱动·先做】先**枚举本文档"覆盖义务清单"(分母)**：每个功能点/交互区(如 W0~W10 或 §章节功能点) + 每条状态/状态机迁移(合法+关键非法) + 总纲 §五每条相关红线(防幻觉/人工确认闸口/权限不放大/丝滑严禁整篇重置/可审计) + 每处"复用现状交互"(挂现状出处) + 各角色(如 <角色1>/<角色2>/<角色3>，按本项目 /init-project 角色清单填充)差异 + 空态/加载/异常/降级。再【逐条】对每条义务产 ≥1 用例([ST]合法+非法、权限 [DT]、≥2 [EG]、五态 100%、配比≈P0:P1:P2=30:50:20)。生成后【自检闭环】：对照义务清单列"未覆盖"→补到全覆盖，或显式标"有意不测+理由"——不允许沉默漏项。
${d.obligations ? '调用方点名的重点义务：' + d.obligations : ''}
⚠️【S1·硬性】**obligations 字段必须结构化输出整张覆盖义务矩阵**(每条义务一行:source/id/desc/status)，status 填命中的 case_id(多条;分隔)或"未覆盖"或"有意不测:理由"——这是机器门(lint --obligations)的对照基准，"未覆盖"会被 lint 判不放行，故宁可标"有意不测:理由"也不留沉默漏项。
${FORMAT}`,
    { label:`gen:${d.prefix}`, phase:'Generate', schema:CASE_SCHEMA }
  ),
  // 阶段2：G2 读码/查文档对抗复核
  (gen, d) => {
    const cases = (gen && gen.cases) || []
    if (!cases.length) return { key:d.prefix, gen, review:{ doc:d.prefix, verdicts:[], mustFix:[] } }
    return agent(
`你是【对抗式】复核员，挑刺刚为目标态方案「${d.name}」生成的用例(默认怀疑、能证伪就证伪)。只读。
对照方案源文档：${d.docPaths.join('、')} 与总纲 §五红线；复用现状处核代码 ${CODE}(@ ${SHA})。
逐条三查：① 引证：复用现状的用例其 文件:行号(@ ${SHA}) 到 ${CODE} Read 核是否真存在真在讲该事(对不上/反指=wrong)；纯目标态的用例其「§x/线框Wx/AC-x」到源文档核是否真有该规定(对不上=wrong；把方案没写的当目标=wrong)；查不到证据=unverifiable；该写出处却没写=no-citation。② 逻辑：expected 是否与源文档/总纲红线/已采纳决策一致(把目标态当现状已有/断言写反/钉死未裁候选=flawed)。③ 覆盖：是否真有可证伪断言(走过场=superficial)。
severity：引证 wrong 或 logic flawed=high/med；coverage superficial=low/med；全 ok/sound/real=none。
待复核用例：
${cases.map((c,i)=>`${i+1}. ${c.case_id} [${c.priority}] ${String(c.scenario).slice(0,80)}`).join('\n')}
按 schema 返回每条裁定 + mustFix。`,
      { label:`review:${d.prefix}`, phase:'SelfReview', schema:REVIEW_SCHEMA }
    ).then(review => ({ key:d.prefix, gen, review }))
  },
  // 阶段3：AutoFix（S2）—— 对 mustFix 命中用例定点重写，其余原样；按 case_id 合并回原集
  (reviewed, d) => {
    const cases = (reviewed && reviewed.gen && reviewed.gen.cases) || []
    const mustFix = (reviewed && reviewed.review && reviewed.review.mustFix) || []
    if (!cases.length || !mustFix.length) return { ...reviewed, fixed:false, fixedCount:0 }
    const vById = Object.fromEntries((((reviewed.review)||{}).verdicts||[]).map(v=>[v.case_id,v]))
    const fixList = mustFix.map(id=>{ const v=vById[id]; return `${id} :: ${v?`[引证=${v.citation}/逻辑=${v.logic}/覆盖=${v.coverage}] ${v.note}`:'(无裁定详情·按通用质量修)'}` }).join('\n')
    const targets = cases.filter(c=>mustFix.includes(c.case_id))
    return agent(
`你是用例修正员。G2 复核为目标态方案「${d.name}」标了 mustFix。请【只重写下列 mustFix 命中的用例】按裁定 note 修正(引证不实→换真实出处或留空/逻辑写反→纠正/覆盖走过场→补可证伪断言)，**只返回这几条的修正版**(cases 数组只含被修条·字段全·schema v2)。修正铁律：不引入新错；复用现状引码@${SHA}(到 ${CODE} 可核)、纯目标态引源文档§/线框W/AC、不编造；字段内禁英文逗号(用中文逗号)、禁真实换行(用字面量\\n)。
mustFix 裁定：
${fixList}
待修用例(JSON)：
${JSON.stringify(targets)}`,
      { label:`fix:${d.prefix}`, phase:'AutoFix', schema:FIX_SCHEMA }
    ).then(fix=>{
      const fm = Object.fromEntries((((fix)||{}).cases||[]).map(c=>[c.case_id,c]))
      const merged = cases.map(c=> fm[c.case_id] || c)
      return { ...reviewed, gen:{ ...reviewed.gen, cases:merged }, fixed:true, fixedCount:Object.keys(fm).length }
    })
  }
)

const clean = groups.filter(Boolean)
const totalCases = clean.reduce((n,g)=> n + (((g.gen||{}).cases)||[]).length, 0)
const totalMustFix = clean.reduce((n,g)=> n + (((g.review||{}).mustFix)||[]).length, 0)
const totalFixed = clean.reduce((n,g)=> n + (g.fixedCount||0), 0)
const obligations = clean.flatMap(g=> (((g.gen)||{}).obligations)||[])
const uncovered = obligations.filter(o=> String(o.status).trim()==='未覆盖')
log(`gen-cases-spec 完成：生成 ${totalCases} 条·G2 标须修 ${totalMustFix}·AutoFix 已修 ${totalFixed}·覆盖义务 ${obligations.length}(未覆盖 ${uncovered.length})。调用方：obligations 渲染 coverage-matrix.md(render-coverage-matrix.mjs) → 过 G1 lint --dir + lint --obligations 写盘 _drafts/.../验收用例/`)
return { groups: clean, sha: SHA, totalCases, totalMustFix, totalFixed, obligations, uncoveredCount: uncovered.length }
