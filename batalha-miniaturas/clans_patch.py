"""Duas afinidades por campeão, mantendo o grupo principal e o elenco existente.

As 27 miniaturas pertencem a dois clãs diferentes. Os seis clãs aparecem
exatamente nove vezes no catálogo completo. Sinergias passam para 3/6.
"""
SECONDARY_CLANS={
 'guard':'sagrado','spear':'selva','axe':'sombra','bow':'sagrado',
 'druid':'arcano','hunter':'sombra','mage':'selva','cleric':'sagrado',
 'golem':'ferro','rogue':'selva','ghost':'selva','paladin':'sagrado',
 'sentinel':'arcano','toxic':'sombra','shaman':'elemental',
 'frost':'elemental','storm':'elemental','necro':'arcano',
 'shade':'elemental','pyro':'sombra','tide':'sagrado',
 'earth':'ferro','spark':'arcano','seraph':'elemental',
 'monk':'ferro','templar':'ferro','oracle':'sombra'
}
PRIMARY_CLANS={
 'guard':'ferro','spear':'ferro','axe':'ferro','bow':'selva','druid':'selva',
 'hunter':'selva','mage':'arcano','cleric':'arcano','golem':'arcano',
 'rogue':'sombra','ghost':'sombra','paladin':'ferro','sentinel':'ferro',
 'toxic':'selva','shaman':'selva','frost':'arcano','storm':'arcano',
 'necro':'sombra','shade':'sombra','pyro':'elemental','tide':'elemental',
 'earth':'elemental','spark':'elemental','seraph':'sagrado',
 'monk':'sagrado','templar':'sagrado','oracle':'sagrado'
}
CLANS=('ferro','selva','arcano','sombra','elemental','sagrado')

def validate_clans():
    assert len(SECONDARY_CLANS)==len(PRIMARY_CLANS)==27
    assert set(SECONDARY_CLANS)==set(PRIMARY_CLANS)
    counts=dict.fromkeys(CLANS,0)
    for typ,primary in PRIMARY_CLANS.items():
        secondary=SECONDARY_CLANS[typ]
        assert primary in counts and secondary in counts and primary!=secondary,typ
        counts[primary]+=1
        counts[secondary]+=1
    assert set(counts.values())=={9},counts
    return counts

def apply_dual_clans_html(html):
    validate_clans()
    def replace(old,new,label):
        nonlocal html
        n=html.count(old)
        if n!=1:raise RuntimeError(f'Clãs duplos: {label}, {n} ocorrências (esperado 1)')
        html=html.replace(old,new,1)
    def region(start,end,func,label):
        nonlocal html
        a=html.find(start)
        b=html.find(end,a+len(start))
        if a<0 or b<0:raise RuntimeError('Clãs duplos: região ausente '+label)
        html=html[:a]+func(html[a:b])+html[b:]
    mapping=','.join(typ+':'+repr(clan) for typ,clan in SECONDARY_CLANS.items())
    replace(
      '// Afinidades de dano independentes da aliança:',
      "const SECONDARY_CLANS={"+mapping+"};\n"
      "for(const [id,t] of Object.entries(TYPES)){"
      "const other=SECONDARY_CLANS[id];"
      "if(!other||other===t.group||!['ferro','selva','arcano','sombra','elemental','sagrado'].includes(other))throw Error('Clã inválido: '+id);"
      "t.clans=Object.freeze([t.group,other]);"
      "}\n"
      "const clanNames=id=>TYPES[id].clans.map(c=>GROUPS[c].name).join(' · ');\n"
      "const clanTags=id=>TYPES[id].clans.map(c=>GROUPS[c].icon+' '+GROUPS[c].name).join(' · ');\n"
      "const clanBadges=id=>TYPES[id].clans.map(c=>'<span class=\"mini-clan-badge\" style=\"--clan-color:'+GROUPS[c].color+'\">'+GROUPS[c].icon+' '+GROUPS[c].name+'</span>').join('');\n"
      '// Afinidades de dano independentes da aliança:',
      'mapa de clãs')
    replace(
      "function countTraits(units){const c=Object.fromEntries(Object.keys(GROUPS).map(id=>[id,0]));const uniqueTypes=new Set(units.map(u=>u.type));uniqueTypes.forEach(type=>{if(TYPES[type])c[TYPES[type].group]++});return c}",
      "function countTraits(units){const c=Object.fromEntries(Object.keys(GROUPS).map(id=>[id,0]));const uniqueTypes=new Set((units||[]).map(u=>u.type));uniqueTypes.forEach(type=>{for(const clan of TYPES[type]?.clans||[])c[clan]++});return c}",
      'contagem por tipos únicos')
    def adjust_buff(s):
        for group in CLANS:
            for old,new in ((f'traits.{group}>=4',f'traits.{group}>=6'),
                            (f'traits.{group}>=2',f'traits.{group}>=3')):
                if old not in s:raise RuntimeError('Clãs duplos: buff não encontrado '+old)
                s=s.replace(old,new)
        return s
    region('function applyTraitBuffs(list){','function startBattle(){',adjust_buff,'bônus')
    # A regeneração é executada tanto na partida quanto no simulador de balanceamento.
    if html.count('traits?.selva>=4')!=2:
        raise RuntimeError('Clãs duplos: regeneração Selva aparece em quantidade inesperada')
    html=html.replace('traits?.selva>=4','traits?.selva>=6')
    def adjust_traits(s):
        changes=[
            ('tier=c>=4?2:c>=2?1:0','tier=c>=6?2:c>=3?1:0'),
            ('2: ${g.desc}','3: ${g.desc}'),
            ('4: ${g.tier4}','6: ${g.tier4}'),
            ('<b>${c}/4</b>','<b>${c}/6</b>')]
        for old,new in changes:
            if s.count(old)!=1:raise RuntimeError('Clãs duplos: barra de sinergias '+old)
            s=s.replace(old,new,1)
        return s
    region('function renderTraits(){','function drawBattleFx(){',adjust_traits,'indicadores')
    replace("(!group||t.group===group)&&(t.name+' '+t.skill+' '+t.tip+' '+GROUPS[t.group].name)",
            "(!group||t.clans.includes(group))&&(t.name+' '+t.skill+' '+t.tip+' '+clanTags(id))",
            'filtro dos clãs no catálogo')
    replace('<div class="catalog-sub">${g.icon} ${esc(g.name)} · ${esc(role.name)}</div>',
            '<div class="catalog-sub">${clanBadges(id)} · ${esc(role.name)}</div>',
            'dois clãs no catálogo')
    replace('Aliança ${g.name}:</b> 2 → ${esc(g.desc)}; 4 → ${esc(g.tier4)}',
            'Dois clãs:</b> ${TYPES[id].clans.map(c=>esc(GROUPS[c].name)+": 3 → "+esc(GROUPS[c].desc)+"; 6 → "+esc(GROUPS[c].tier4)).join(" | ")}',
            'descrição de sinergias')
    replace('${g.icon} ${g.name} · ${ROLES[roleOf(type)].icon} ${ROLES[roleOf(type)].name}',
            '${clanBadges(type)} · ${ROLES[roleOf(type)].icon} ${ROLES[roleOf(type)].name}',
            'dois clãs na loja da partida')
    replace('${g.icon} ${g.name} · ${role.icon} ${role.name}',
            '${clanBadges(game.shop[i])} · ${role.icon} ${role.name}',
            'dois clãs na ficha de compra')
    # Itens em elementos individuais, com nome disponível na inspeção.
    replace("piece.items.map(id=>ITEMS[id]?.icon||'◆').join('')",
            """piece.items.map(id=>'<span class="mini-equipped-item" title="'+esc(ITEMS[id]?.name||id)+'">'+(ITEMS[id]?.icon||'◆')+'</span>').join('')""",
            'ícones de equipamentos independentes')
    replace('<div class="mini-name">${esc(t.name)}</div>',
            '<div class="mini-name">${esc(t.name)}</div><div class="mini-clan-pair" aria-label="${esc(clanNames(piece.type))}">${t.clans.map(clan=>\'<span class="mini-clan-mark" title="\'+esc(GROUPS[clan].name)+\'" style="--clan-color:\'+GROUPS[clan].color+\'">\'+GROUPS[clan].icon+\'</span>\').join("")}</div>',
            'ícones dos clãs no tabuleiro')
    replace('${t.cost} 🪙 · ${esc(t.skill)}</small>',
            '${t.cost} 🪙 · ${esc(clanTags(k))} · ${esc(t.skill)}</small>',
            'clãs no elenco')
    replace('const g=TYPES[type].group,role=roleOf(type);\n return Object.keys(TYPES).find(id=>id!==type&&TYPES[id].group===g&&roleOf(id)!==role)||Object.keys(TYPES).find(id=>id!==type&&TYPES[id].group===g);',
            'const affinities=TYPES[type].clans,role=roleOf(type);\n return Object.keys(TYPES).find(id=>id!==type&&TYPES[id].clans.some(c=>affinities.includes(c))&&roleOf(id)!==role)||Object.keys(TYPES).find(id=>id!==type&&TYPES[id].clans.some(c=>affinities.includes(c)));',
            'parceiro com clã em comum')
    return html

def verify_dual_clans_html(html):
    validate_clans()
    patched=apply_dual_clans_html(html)
    assert 'mini-equipped-item' in patched
    for marker in ('traits.ferro>=6','traits.selva>=3',
                   'const SECONDARY_CLANS=','clanBadges(game.shop[i])',
                   'clanBadges(id)','mini-clan-pair','tier=c>=6?2:c>=3?1:0'):
        assert marker in patched,marker
    return True
