/* eslint-disable @typescript-eslint/no-require-imports -- Existing node:test TypeScript hook. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args); };
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { buildPalmReadingSections, buildRealObservationText, buildTraditionalReadingText } = require('../src/lib/palm-observation-text.ts');
const { buildTripleCompare } = require('../src/lib/triple-compare.ts');
const { scorePersonalityCheck } = require('../src/lib/personality-check.ts');
const { deriveSajuWorkCore } = require('../src/lib/saju-work-core.ts');
const line = (changes={}) => ({detected:true,length:'김',curve:'완만한 곡선',depthStrength:'보통',start:{x:.1,y:.2},end:{x:.8,y:.4},branchDetected:null,...changes});
const lines = (changes={}) => ({modelExecuted:true,heartLine:line(),headLine:line({curve:'직선에 가까움'}),lifeLine:line(),fateLine:{presence:'unknown',note:'미확인'},mounts:'unknown',marks:'unknown',...changes});
const facts = {dayStrength:'neutral',officerStarCount:2,resourceStarCount:1,peerStarCount:1,outputStarCount:2};

test('visible heart/head features produce substantive distinct readings and a practical reflection', () => {
  const sections = buildPalmReadingSections(lines());
  assert.deepEqual(sections.map(s=>s.key),['heartLine','headLine','together']);
  assert.match(sections[0].observation,/감정선.*길게.*곡선/);
  assert.match(sections[0].text,/관계/);
  assert.match(sections[1].text,/생각|사고/);
  assert.match(sections[2].text,/마음|관계/);
  for(const s of sections) assert.ok(s.text.length>90,s.key);
  assert.notEqual(sections[0].text,sections[1].text);
  assert.doesNotMatch(sections.map(s=>s.text).join(' '),/해석하지|비교 불가|판정하지|수명|질병|부자|결정이 빠|판단이 빠/);
});
test('length and curve each affect only the observed line reading, not decision speed', () => {
  const baseline=buildPalmReadingSections(lines());
  for(const change of [{length:'짧음'},{curve:'완만한 곡선'}]) {
    const changed=buildPalmReadingSections(lines({headLine:line({curve:'직선에 가까움',...change})}));
    assert.notEqual(changed[1].text,baseline[1].text);
    assert.equal(changed[0].text,baseline[0].text);
    assert.doesNotMatch(changed[1].text,/빠르게 결정|판단이 빠|오래 따져|결정 속도/);
  }
});
test('missing attributes never default to straight, average or a combined reading', () => {
  const partial=lines({heartLine:line({length:null,curve:null}),headLine:line({length:null,curve:'완만한 곡선'})});
  const sections=buildPalmReadingSections(partial);
  assert.deepEqual(sections.map(s=>s.key),['headLine']);
  assert.match(sections[0].text,/직관|상상/);
  assert.doesNotMatch(sections[0].text,/직선|보통|긴 두뇌선|짧은 두뇌선/);
  const observation=buildRealObservationText({onnxLines:partial});
  assert.doesNotMatch(observation,/null|undefined|보통 길이/);
  assert.match(observation,/감정선.*선명/);
});
test('undetected lines and missing model produce no invented interpretation', () => {
  assert.deepEqual(buildPalmReadingSections(null),[]);
  const absent=lines({heartLine:line({detected:false}),headLine:line({detected:false})});
  assert.deepEqual(buildPalmReadingSections(absent),[]);
  assert.match(buildTraditionalReadingText({onnxLines:absent}),/다시 촬영/);
});
test('customer synthesis explains each available perspective without comparison-failure copy', () => {
  const check=scorePersonalityCheck({speed:3,autonomy:1});
  const items=buildTripleCompare(facts,lines(),check);
  assert.match(items[0].text,/사주/);
  assert.match(items[0].text,/두뇌선.*직선/);
  assert.match(items[0].text,/중간/);
  assert.match(items[1].text,/감정선.*곡선/);
  assert.match(items[1].text,/직접.*혼자|직접.*스스로/);
  assert.doesNotMatch(items.map(s=>s.text).join(' '),/비교 불가|판정하지|측정한 값|미확인|다른 의미/);
  assert.equal(items[0].signals.self.state,'NEUTRAL');
  assert.equal(items[0].signals.saju.state,'NEUTRAL');
  assert.equal(items[0].signals.palm.state,'NOT_COMPARABLE');
  assert.ok(items.every(s=>!['일치','차이','보완'].includes(s.kind)));
  const alternate=buildTripleCompare(facts,lines({headLine:line({curve:'완만한 곡선'})}),check);
  assert.notEqual(items[0].text,alternate[0].text);
});
test('skipped palm and unanswered questions are omitted instead of failed-reading filler', () => {
  const text=buildTripleCompare(facts,null,null).map(i=>i.text).join(' ');
  assert.match(text,/사주/);
  assert.doesNotMatch(text,/손금|두뇌선|감정선|미확인|비교 불가|직접 응답|판정하지/);
});
test('saju work sections give distinct useful interpretations, with method boundaries in evidence', () => {
  const sections=deriveSajuWorkCore(facts).sections;
  assert.equal(new Set(Object.values(sections).map(s=>s.text)).size,4);
  assert.match(sections.teamStrength.text,/팀|동료/);
  assert.match(sections.soloStrength.text,/혼자|직접/);
  for(const s of Object.values(sections)) {
    assert.ok(s.text.length>90);
    assert.doesNotMatch(s.text,/측정.*아닙니다|확인한.*아닙니다|출생정보로 정하지|별도 확인|확인해야 합니다/);
    assert.match(s.evidence,/전통/);
  }
});

test('opening and core saju reading explain a theme instead of repeating defensive disclaimers', () => {
  const {computeSajuFacts}=require('../src/lib/saju-facts.ts');
  const {buildFreeSajuReport}=require('../src/lib/free-report-mock.ts');
  const sample=computeSajuFacts({year:1990,month:5,day:15,hour:12,minute:0,gender:'남'});
  for(const strength of ['strong','weak','neutral']) {
    const report=buildFreeSajuReport({...sample,dayStrength:strength});
    for(const key of ['snapshot','keepingStyle','peopleAndMoney','decisionStyle']) {
      assert.ok(report[key].text.length>90,key);
      assert.doesNotMatch(report[key].text,/측정한|뜻은 아닙니다|별도 확인|판단할 수 없|확인한 값|구분해 보세요|문제가 있다고 보지/);
    }
  }
});

test('real reading components render substantive sections, never internal comparison badges', () => {
  require.extensions['.tsx']=(mod,filename)=>mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  const React=require('react');
  const {renderToStaticMarkup}=require('react-dom/server');
  const {PalmReadingSections,TripleCompareSection}=require('../src/components/palm/palm-reading-sections.tsx');
  const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
    React.createElement(PalmReadingSections,{facts:{onnxLines:lines()}}),
    React.createElement(TripleCompareSection,{items:buildTripleCompare(facts,lines(),scorePersonalityCheck({speed:3,autonomy:3}))})));
  assert.match(html,/감정선 · 마음을 주고 표현하는 방식/);
  assert.match(html,/두뇌선 · 생각을 펼치고 정리하는 방식/);
  assert.match(html,/두 선을 함께 읽으면/);
  assert.match(html,/사주·손금·내 응답을 함께 보면/);
  assert.doesNotMatch(html,/비교 불가|판정하지|NOT_COMPARABLE/);
});
