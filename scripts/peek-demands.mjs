const { demandsWithScore, directives, types, LANGUAGE_DOCS } = await import('./extract-demands.mjs');
console.log('=== demands ===', demandsWithScore.length);
demandsWithScore.forEach((d, i) => {
  const v = d.scores.map((s) => s.verdict).join('/') || '-';
  console.log(`  ${String(i + 1).padStart(2)} [${v.padEnd(11)}] ${d.kind === 'notice' ? 'NOTICE' : '      '} ${d.text.slice(0, 84)}`);
});
console.log('\n=== directives ===', directives.length);
directives.forEach((d) => console.log(`  #${d.name.padEnd(12)} x${String(d.count).padStart(3)}  ${d.desc.slice(0, 66)}`));
console.log('\n=== types ===', types.map((t) => `${t.type}x${t.count}`).join(' '));
console.log('=== docs ===', LANGUAGE_DOCS.length);
