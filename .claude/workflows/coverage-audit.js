export const meta = {
  name: 'coverage-audit',
  description: '用例库覆盖全面性审计：逐模块可追溯矩阵(功能点/规则/状态机/判定表/权限/五态/DIFF回归) + 对抗式复核 gap(剔误报)。供 publish-baseline 发布门与 /pipeline-review 周期体检调用。args={root,codeRoot,sha,modules:[{code,name,flag?}]}',
  phases: [
    { title: 'Audit', detail: '逐模块覆盖审计：用例↔01/03/04/06 可追溯矩阵' },
    { title: 'Verify', detail: '对抗复核每模块声称的 gap，剔除误报' },
  ],
}

// ── 入参（项目无关：调用方=命令/主对话先列 product-docs/modules/ 再注入；workflow 不做文件发现）──
const A = args || {}
const ROOT = A.root
const CODE = A.codeRoot || (ROOT && ROOT + '/code')
const SHA = A.sha || 'HEAD'
const MODULES = A.modules || []
if (!ROOT || !MODULES.length) {
  log('⚠ coverage-audit：需传 args.root(工作空间绝对路径) + args.modules（形如 [{code:"M01",name:"<模块名>"}]）；codeRoot/sha 可选(默认 root/code 与 HEAD)。调用方先 `ls product-docs/modules/` 构造清单、取快照 SHA 再传入。返回空。')
  return { results: [], note: 'missing args.root or args.modules' }
}

const AUDIT_SCHEMA = {
  type:'object',
  required:['module','fpCoverage','ruleCoverage','stateMachine','decisionTablePermission','feCoverage','diffChgDepth','fiveStateAdequacy','negativeBoundaryDepth','gaps','moduleVerdict'],
  properties:{
    module:{type:'string'},
    fpCoverage:{type:'object',required:['totalFP','coveredFP','uncovered'],properties:{
      totalFP:{type:'integer'},coveredFP:{type:'integer'},
      uncovered:{type:'array',items:{type:'string'},description:'无任何用例覆盖的功能点编号+一句话'}}},
    ruleCoverage:{type:'string'},
    stateMachine:{type:'object',required:['entities','assessment'],properties:{
      entities:{type:'array',items:{type:'string'}},assessment:{type:'string'}}},
    decisionTablePermission:{type:'string'},
    feCoverage:{type:'string'},
    diffChgDepth:{type:'string',description:'关联 DIFF/CHG 用例厚度：仅现状取证 vs 含修复后断言/反向回归'},
    fiveStateAdequacy:{type:'string'},
    negativeBoundaryDepth:{type:'string'},
    gaps:{type:'array',items:{type:'object',required:['dim','desc','severity'],properties:{
      dim:{type:'string',enum:['功能点','业务规则','状态机','判定表/权限','FE问题','DIFF/CHG回归','五态','负向/边界','跨模块','其它']},
      desc:{type:'string'},
      severity:{type:'string',enum:['高','中','低']}}}},
    moduleVerdict:{type:'string',description:'覆盖档位：充分/基本充分/有明显缺口/薄弱'}
  }
}
const VERIFY_SCHEMA = {
  type:'object',required:['module','verifiedGaps','overallVerdict'],
  properties:{
    module:{type:'string'},
    verifiedGaps:{type:'array',items:{type:'object',required:['gap','confirmed','note'],properties:{
      gap:{type:'string'},confirmed:{type:'string',enum:['真缺口','误报(其实有覆盖)','部分(有但不足)']},note:{type:'string'}}}},
    missedByAuditor:{type:'array',items:{type:'string'}},
    overallVerdict:{type:'string'}
  }
}

phase('Audit')

const results = await pipeline(
  MODULES,
  (m) => agent(
`你是资深测试专家，审计模块 ${m.code}-${m.name} 的【验收用例库覆盖全面性】。只读，不改任何文件。

设计标准：6+1 法(EC/BV/DT/SC/EG/ST/VR)；五态 100% 覆盖(不适用显式 na)；优先级 P0:P1:P2≈30:50:20；状态实体≥1合法迁移+≥1非法迁移[ST]；判定表/权限每规则≥1[DT]；每模块≥2[EG]；fe_ref/diff_ref/chg_ref 真实可追溯；每条能写成 Given/When/Then。覆盖率：合法迁移100%+关键非法≥60%；判定表每规则≥1；权限矩阵每角色≥1。
${m.flag ? '特别关注：' + m.flag : ''}

必读(相对 ${ROOT})：
- product-docs/modules/${m.code}-${m.name}/01-功能说明.md（功能点 FP-xx=覆盖率分母）
- product-docs/modules/${m.code}-${m.name}/03-页面交互问题清单.md（FE-xxx，尤其 severity 高）
- product-docs/modules/${m.code}-${m.name}/04-业务规则与状态机.md（规则 R/状态机/判定表/权限矩阵）
- product-docs/modules/${m.code}-${m.name}/06-验收测试清单.md
- test/test-cases/${m.code}-${m.name}.csv（全部用例；schema v2 19 列）

做【可追溯矩阵式】审计：把 01 每个 FP、04 每条规则/每条状态迁移/每条判定表规则/每个权限角色、03 每个高 severity FE、关联每个 DIFF/CHG，逐一对到 CSV 有无对应用例(scenario/steps 关键词或 fe_ref/diff_ref/chg_ref 匹配)。重点找【无任何用例覆盖】或【只有 success 缺 error/非法迁移/边界】的项。na 偏多的五态要判断合理(纯后端)还是掩盖应测态。
gaps 只列实证确认(读到 01/04 有该项、搜 CSV 确无对应用例)的具体缺口，每条带编号佐证，按 schema 返回。`,
    { label:`audit:${m.code}`, phase:'Audit', schema:AUDIT_SCHEMA }
  ),
  (audit, m) => {
    if (!audit || !(audit.gaps||[]).length) return { audit, verify:{ module:m.code, verifiedGaps:[], overallVerdict:'审计未报 gap 或失败，跳过复核' } }
    return agent(
`你是对抗式复核员。另一测试专家审计模块 ${m.code}-${m.name} 用例覆盖，声称以下缺口。逐条复核是否【真无用例覆盖】，剔除误报(审计员可能没搜全)。只读。
复核法：对每条 gap 到 test/test-cases/${m.code}-${m.name}.csv（相对 ${ROOT}）用 Grep/Read 搜关键词/fe_ref/diff_ref/chg_ref/功能点名词确认有无覆盖。默认怀疑——搜到合理覆盖判"误报"或"部分"。
待复核缺口：
${audit.gaps.map((g,i)=>`${i+1}. [${g.severity}][${g.dim}] ${g.desc}`).join('\n')}
另扫一遍 CSV 看审计员有无【漏报】的明显缺口(高 severity FE 或某 DIFF 完全无用例)。按 schema 返回。`,
      { label:`verify:${m.code}`, phase:'Verify', schema:VERIFY_SCHEMA }
    ).then(verify => ({ audit, verify }))
  }
)

return { results: results.filter(Boolean), sha: SHA, moduleCount: MODULES.length }
