export const meta = {
  name: 'gen-cases',
  description: '闭环驱动批量生成验收用例(schema v2 19列·先枚举覆盖义务分母再逐条覆盖) + 内建 G2 对抗复核(读码核引证/逻辑/覆盖)。mode=full 全量 / gap 补缺 / scn 跨模块端到端链路。供 /init-docs CASES 阶段调用。每模块: 闭环生成→读码自检。返回结构化行+复核裁定，由调用方过 G1 静态门禁后写盘。args={root,codeRoot,sha,modules:[{code,name,start,mode,gaps?}]}',
  phases: [
    { title: 'Generate', detail: '逐模块 doc-grounded 生成用例 + 结构化覆盖义务矩阵(S1)' },
    { title: 'SelfReview', detail: 'G2 读码对抗复核新用例(引证/逻辑/覆盖)' },
    { title: 'AutoFix', detail: '对 mustFix 命中用例定点重写(S2)·按裁定note修·其余原样' },
  ],
}

// 项目无关：root/sha 由调用方(命令/主对话)注入；codeRoot 默认 root/code（CLAUDE.md 结构速览 code/<仓库>/）
const A = args || {}
const ROOT = A.root
const CODE = A.codeRoot || (ROOT && ROOT + '/code')
const SHA = A.sha || 'HEAD'
const MODULES = A.modules || []
if (!ROOT || !MODULES.length) {
  log('⚠ gen-cases：需传 args.root(工作空间绝对路径) + args.modules([{code,name,start:"TC-<ABBR>-0NN",mode:"full|gap|scn",gaps?}])；codeRoot/sha 可选(默认 root/code 与 HEAD)。调用方先 ls product-docs/modules/ 发现模块、从 baseline/01 或 PROJECT-PROFILE 取快照 SHA 再注入。返回空。')
  return { groups: [], note: 'missing args.root or args.modules' }
}

const FORMAT = `
【输出=test-cases CSV 行，schema v2 共 19 字段，顺序固定】
case_id,module,page,route,fe_ref,diff_ref,chg_ref,baseline_version,priority,scenario,preconditions,steps,expected,five_states,evidence_required,automation_type,automation_path,owner,last_updated
铁律(违反=作废)：
- ⚠️【CSV完整性·最高优先】任何字段值内严禁英文逗号 ,（用中文逗号，或顿号、）；全库单逗号分隔且字段内零逗号。
- scenario 以方法标签开头 [EC]/[BV]/[DT]/[SC]/[EG]/[ST] 可组合；句式「<角色> <动作> <对象>，校验<断言>（<关键预期>）」≤120字。
- steps 多步用字面量 \\n(两字符 反斜杠+n) 从 1) 起；expected 与之对齐。多值字段(fe_ref/diff_ref/chg_ref/five_states/evidence_required)内部用英文分号 ;。
- five_states 选 loading;empty;error;success;permission，不适用写 na；失败/越权/异常务必显式含 error 或 permission，勿全 na。
- baseline_version 取当前生效基线(默认 B1.0.0)；automation_type=manual；automation_path=na；owner=PM；last_updated 用调用方给的日期(默认 today)。
- 可追溯：fe_ref/diff_ref/chg_ref 必须真实存在(该模块 03 清单/台账可查)，查不到留空。
- 在途 DIFF/CHG(待裁决)用例：既给【现状取证】又给【修复后期望】；修复后期望标「待 DIFF/CHG 裁决后启用」、不钉死未选候选、不要把当前 @${SHA} 的 bug 行标成「修复后口径」(那是 bug 出处)。
- 引证带 @ ${SHA} 且行号真实(到 ${CODE} 核对)；case_id 从指定起号连续递增、零跳号。`

const CASE_FIELDS = ['case_id','module','page','route','fe_ref','diff_ref','chg_ref','baseline_version','priority','scenario','preconditions','steps','expected','five_states','evidence_required','automation_type','automation_path','owner','last_updated']
const CASE_SCHEMA = {
  type:'object', required:['cases','obligations','notes'],
  properties:{
    cases:{type:'array',items:{type:'object',required:CASE_FIELDS,
      properties:Object.fromEntries(CASE_FIELDS.map(k=>[k,{type:'string'}]))}},
    // S1：结构化覆盖义务矩阵(分母)——取代自由文本闭环自检，供 lint --obligations 机器门校验
    obligations:{type:'array',description:'本模块覆盖义务清单(分母)，每条义务→覆盖状态',
      items:{type:'object',required:['source','id','desc','status'],properties:{
        source:{type:'string',description:'义务来源:FP/规则R/状态机/判定表/权限/FE/DIFF/CHG/验收点/跨模块'},
        id:{type:'string',description:'义务编号(如 FP-03 / R5 / 状态:reviewing→available / 权限:customer×执行)'},
        desc:{type:'string',description:'义务一句话'},
        status:{type:'string',description:'覆盖状态:命中的 case_id(多条用;分隔) 或 "未覆盖" 或 "有意不测:理由"'}}}},
    notes:{type:'string',description:'生成说明：覆盖的 FP/R/FE/DIFF 编号映射'}
  }
}
const FIX_SCHEMA = {
  type:'object', required:['cases'],
  properties:{ cases:{type:'array',description:'仅被修正的用例(corrected versions·只含 mustFix 命中条)',
    items:{type:'object',required:CASE_FIELDS,properties:Object.fromEntries(CASE_FIELDS.map(k=>[k,{type:'string'}]))}} }
}
const REVIEW_SCHEMA = {
  type:'object', required:['module','verdicts','mustFix'],
  properties:{
    module:{type:'string'},
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
  MODULES,
  // 阶段1：生成（闭环驱动 · full/gap/scn 三模式）
  (m) => {
    let readList, header
    if (m.mode === 'scn') {
      readList = `product-docs/00-产品全景.md § 三(端到端主流程)、各模块 06-验收测试清单.md、baseline/02-PRD-实现差异台账.md(交界 DIFF)、test/test-cases/SCN-跨模块场景.csv(已有链路/风格)`
      header = `生成【跨模块端到端链路】用例(module 字段统一写"跨模块场景")。来源=00 § 三**每条主流程逐条** + 台账交界 DIFF(取数回落/排名口径/渲染键等跨模块缺陷) + 角色纵切(同一角色全链路作用域一致)。每条 [SC]/[SC+ST] 串多个模块、**给每一跳的数据传递断言**(非只验首尾)。00 § 三主流程不漏。`
    } else {
      readList = `product-docs/modules/${m.code}-${m.name}/{01-功能说明,03-页面交互问题清单,04-业务规则与状态机,06-验收测试清单}.md、test/test-cases/${m.code}-${m.name}.csv(现有风格/route/已用 case_id)、baseline/02|03 台账`
      const body = m.mode === 'gap'
        ? `本轮只补【缺口清单】：\n${m.gaps || '(mode=gap 但未带 gaps；若无可补返回空 cases)'}`
        : `本模块全量覆盖。`
      header = `⚠️【闭环驱动·先做】先**枚举本模块"覆盖义务清单"(分母)**：01 每个 FP-xx + 04 每条规则 R/状态机合法&关键非法迁移/判定表每规则/权限矩阵每「角色×操作」格 + 03 每个高 severity FE + 关联每个 DIFF·CHG + 06 每个验收点。再【逐条】对每条义务产 ≥1 用例(状态机 [ST]合法+非法、权限 [DT]、每模块≥2 [EG]、五态 100%、配比≈30:50:20)。生成后【自检闭环】：对照义务清单列出"未覆盖"项→补到全覆盖，或在 notes 显式标"有意不测+理由"——**不允许沉默漏项(这是用例"一直不全"的根因)**。\n${body}`
    }
    return agent(
`为 ${m.mode === 'scn' ? '跨模块场景' : ('模块 ' + m.code + '-' + m.name)} 生成验收用例(测试专家·doc-grounded·闭环驱动见 test/test-cases/_测试设计方法.md § 〇 与跨模块 § 4.4b)。只读文档。
必读(相对 ${ROOT})：${readList}。
case_id 从 ${m.start || (m.mode === 'scn' ? 'TC-SCN-001' : 'TC-XXX-001')} 起连续编号、零跳号。
${header}
⚠️【S1·硬性】**obligations 字段必须结构化输出整张覆盖义务矩阵**(每条义务一行:source/id/desc/status)，status 填命中 case_id(多条;分隔)或"未覆盖"或"有意不测:理由"——这是机器门(lint --obligations)对照基准，"未覆盖"会被判不放行，宁可标"有意不测:理由"也不留沉默漏项。
${FORMAT}`,
      { label:`gen:${m.code}`, phase:'Generate', schema:CASE_SCHEMA }
    )
  },
  // 阶段2：G2 读码对抗复核（生成完即审，不等其他模块）
  (gen, m) => {
    const cases = (gen && gen.cases) || []
    if (!cases.length) return { code:m.code, gen, review:{ module:m.code, verdicts:[], mustFix:[] } }
    return agent(
`你是【对抗式】复核员，挑刺刚为模块 ${m.code}-${m.name} 生成的用例(默认怀疑、能证伪就证伪)。只读源码、核用例。
读 test/test-cases/${m.code}-${m.name}.csv 风格参照 + 下列新用例；对照 product-docs/modules/${m.code}-${m.name}/{01,03,04,06}；代码快照 ${CODE}(@ ${SHA})。
逐条三查：① 引证准确性：steps/expected 里 文件:行号(@ ${SHA}) 到 ${CODE} Read 核对是否真存在、真在讲该事(对不上=wrong/反指未修复行当"修复后口径"=wrong)。② 逻辑正确性：expected 是否与权威设计/裁决一致(抓"把现状当目标/把 bug 当正确/断言写反/钉死未裁候选"=flawed)。③ 覆盖真实性：是否真有可证伪断言(走过场=superficial)。
severity：引证 wrong 或 logic flawed=high/med；coverage superficial=low/med；全 ok/sound/real=none。
待复核用例：
${cases.map((c,i)=>`${i+1}. ${c.case_id} [${c.priority}] ${String(c.scenario).slice(0,80)}`).join('\n')}
按 schema 返回每条裁定 + mustFix。`,
      { label:`review:${m.code}`, phase:'SelfReview', schema:REVIEW_SCHEMA }
    ).then(review => ({ code:m.code, gen, review }))
  },
  // 阶段3：AutoFix（S2）—— 对 mustFix 命中用例定点重写，其余原样；按 case_id 合并回原集
  (reviewed, m) => {
    const cases = (reviewed && reviewed.gen && reviewed.gen.cases) || []
    const mustFix = (reviewed && reviewed.review && reviewed.review.mustFix) || []
    if (!cases.length || !mustFix.length) return { ...reviewed, fixed:false, fixedCount:0 }
    const vById = Object.fromEntries((((reviewed.review)||{}).verdicts||[]).map(v=>[v.case_id,v]))
    const fixList = mustFix.map(id=>{ const v=vById[id]; return `${id} :: ${v?`[引证=${v.citation}/逻辑=${v.logic}/覆盖=${v.coverage}] ${v.note}`:'(无裁定详情·按通用质量修)'}` }).join('\n')
    const targets = cases.filter(c=>mustFix.includes(c.case_id))
    return agent(
`你是用例修正员。G2 复核为模块 ${m.code}-${m.name} 标了 mustFix。请【只重写下列 mustFix 命中的用例】按裁定 note 修正(引证不实→读码核实换真实行号@${SHA}或留空/逻辑写反→纠正/把现状当目标→拨正/覆盖走过场→补可证伪断言)，**只返回这几条的修正版**(cases 数组只含被修条·字段全·schema v2)。铁律：不引入新错；引证须到 ${CODE}(@${SHA}) 可核；字段内禁英文逗号(用中文逗号)、禁真实换行(用字面量\\n)。
mustFix 裁定：
${fixList}
待修用例(JSON)：
${JSON.stringify(targets)}`,
      { label:`fix:${m.code}`, phase:'AutoFix', schema:FIX_SCHEMA }
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
log(`gen-cases 完成：生成 ${totalCases} 条·G2 标须修 ${totalMustFix}·AutoFix 已修 ${totalFixed}·覆盖义务 ${obligations.length}(未覆盖 ${uncovered.length})。调用方：obligations 渲染 coverage-matrix.md → 过 G1 lint + lint --obligations 写盘`)
return { groups: clean, sha: SHA, totalCases, totalMustFix, totalFixed, obligations, uncoveredCount: uncovered.length }
