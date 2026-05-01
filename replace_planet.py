import re

with open("src/app/solarsystem/components/Planet.tsx", "r") as f:
    text = f.read()

# We want to replace everything from "        {/* Crust */}" down to "      </group>" right before "{/* Saturn's Rings */}"
pattern = re.compile(r"        \{\/\* Crust \*/}.*?      <\/group>", re.DOTALL)

replacement = """        {/* Layer Groups and Tooltip */}
        {isFocused && structure ? (
          <>
            {hoveredLayer && (
              <Html position={[0, planetSize + (hoveredLayer === 'atmosphere' ? (structure.atmosphereRadius || 1) * 0.5 : 0.5), 0]} center zIndexRange={[100, 0]}>
                <div style={{
                  background: 'rgba(18,18,22,0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderTop: `2px solid ${hoveredLayer === 'core' ? (structure.coreColor || '#ececec') : hoveredLayer === 'mantle' ? (structure.mantleColor || '#ffaa00') : hoveredLayer === 'crust' ? '#66AAFF' : (structure.atmosphereColor || import re

with open("src/app/sobo
with opus:    text = f.read()

# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Crust \*/}.*?      <\/group>", re.DOTALL)

replacement = """        {/* Layer Groups  
replacement = """        {/* Layer Groups and Tooltip */}
        {isFocused            {isFocused && structure ? (
          <>
       st          <>
            {hoveredLre           ur              <Html position=ov                <div style={{
                  background: 'rgba(18,18,22,0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                 f                  backgroundng                  border: '1px solid rgba(255,255,2pi                  borderTop: `2px solid ${hoveredLayer === '  
with open("src/app/sobo
with opus:    text = f.read()

# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Crust \*/}.*?      <\/group>", re.DOTALL)

replacement = ""n style={{ color: 'rgba(255,255,2with opus:    text = f11
# We want to replace everyt   # We want to repl',
pattern = re.compile(r" 5,pattern = re.compize
replacement = """        {/* Layer Groups  
replacement = """        {/* Laye   replacement = """        {/* Layer Groups ad        {isFocused            {isFocused && structure ? Fr          <>
       st          <>
            {hoveredL =       st   ?            {hovereadi                  background: 'rgba(18,18,22,0.96)',
                  border: '1px solid rgba(                    border: '1px solid rgba(255,255,2oc                 f                  backgroundng              with open("src/app/sobo
with opus:    text = f.read()

# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to replace everyt
  # We want to repl',
pattern = re.compile(r"   pattern = re.compiOp
replacement = ""n style={{ color: 'rgba(255,255,2with opus:    text = f11
# W   # We want to replace everyt   # We want to repl',
pattern = re.compile(rr(pattern = re.compile(r" 5,pattern = re.compize
r(ereplacement = """        {/* Layer Groups  
rulreplacement = """        {/* Laye   replacsh       st          <>
            {hoveredL =       st   ?            {hovereadi                  background: 'rgba(18,18,22,0.96)',
                me            {hoveredol                  border: '1px solid rgba(                    border: '1px solid rgba(255,255,2oc            tywith opus:    text = f.read()

# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to rep |
# We want to replace everyt /># We want to repl',
pattern = re.compile(r" shpattern = re.compi  # We want to replace everyt
  # We want to repl',
pattern = re.com,   # We want to repl',
pattI pattern = re.compile>
replacement = ""n style={{ color: 'rgba(255,2={# W   # We want to replace everyt   # We want to repl',
pattern = re.comlopattern = re.compile(rr(pattern = re.compile(r" 5,pattacr(ereplacement = """        {/* Layer Groups  
rulreplacement = """    rulreplacement = """        {/* Laye   replac'             {hoveredL =       st   ?            {hovereadi         15                me            {hoveredol                  border: '1px solid rgba(                    border:ou
# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to rep |
# We want to replace ever   # We want to repl',
pattern = re.compile(r" sppattGeometry args={[# We want to rep |
# We want to replace everyt /># We want to repl  # We want to replrdpattern = re.compile(r" shpattern = re.compi  # RE  # We want to repl',
pattern = re.com,   # We want to repl',
pattI patt  pattern = re.com,   edpattI pattern = re.compile>
replacemenFFreplacement = ""n style=    pattern = re.comlopattern = re.compile(rr(pattern = re.compile(r" 5,pattacr(ereplacement = """       h.rulreplacement = """    rulreplacement = """        {/* Laye   replac'             {hoveredL =       st   ?            Do# We want to replace everything from "       
# We want to repl',
pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to rep |
# We want to replace ever   # We want to repl',
pattern = re.compile(r" sppattGeometry args={[# Wot# We want to repl',
pattern = re.compile(r" >
pattern = re.compiin# We want to rep[planetSize * structure.mantleRadius, planetSize, 32# We want to repl 2pattern = re.compile(r" sppattGeometry args={[lo# We want to replace everyt /># We want to repl  # We want to rnspattern = re.com,   # We want to repl',
pattI patt  pattern = re.com,   edpattI pattern = re.compile>
replacemenFFreplacement = ""n style=  pattI patt  pattern = re.com,   edpatt2,replacemenFFreplacement = ""n style=    pattern = re.comlopas=# We want to repl',
pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to rep |
# We want to replace ever   # We want to repl',
pattern = re.compile(r" sppattGeometry args={[# Wot# We want to repl',
pattern = re.compile(r" >
pattern = re.compiin# We want to rep[planetSize * struct  pattern = re.compi  # We want to rep |
[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
     # We want to repleopattern = re.compile(r" sppattGeometry args={[uspattern = re.compile(r" >
pattern = re.compiin# We want to rep[planetespattern = re.compiin# We{cpattI patt  pattern = re.com,   edpattI pattern = re.compile>
replacemenFFreplacement = ""n style=  pattI patt  pattern = re.com,   edpatt2,replacemenFFreplacement = ""n style=    pattern = re.comlopas=# We want to repl',
pattern = re.compile(r"        \{\/\roreplacemenFFreplacement = ""n style=  pattI patt  pattern = ; pattern = re.compile(r"        \{\/\* Cru/swith o                 <
# We want to rep |
# We want to replace ever   # We want to repl',
pattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We want to repl 1pattern = re.compile(r" sppattGeometry args={[tapattern = re.compile(r" >
pattern = re.compiin# We want to resive={strupattern = re.compiin# Wefa[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
     # We want to repleopattern = re.compile(r" sppay     # We want to repleopattern = re.compianpattern = re.compiin# We want to rep[planetespattern = re.compiin# We{cpattI patt  pattern = re.  replacemenFFreplacement = ""n style=  pattI patt  pattern = re.com,   edpatt2,replacemenFFreplacement = ""n style=    pattern = re.  pattern = re.compile(r"        \{\/\roreplacemenFFreplacement = ""n style=  pattI patt  pattern = ; pattern = re.compile(r"        \{\/\* Cru/swith o          /# We want to rep |
# We want to replace ever   # We want to repl',
pattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.compiin# Wefa[-Math.PI / 2, 0, 0]} positions, 32, 1, 0, Math.PI / 2]} />
                # We want to repleopattern = re.compile(r" sppay     # We want to repleopattern = re.compianpattern = re.com"}# We want to replace ever   # We want to repl',
pattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.compiin# Wefa[-Math.PI / 2, 0, 0]} positions, 32, 1, 0, Math.PI / 2]} />
                # We want to repleopattern = re.compile(r" sppay     # We want to repleopattern = re.compianpattertupattern = re.compile(r   # We want to rep |
# ={# We want to replace ever   # We want to r  # ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.compiin# Wef                  # We want to repleopattern = re.compile(r" sppay     # We want to repleopattern = re.compianpattern = re.com"}# We want to replace ever   # We want to repl',
patrupattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.compiin# Wefa0                # We want to repleopattern = re.compile(r" sppay     # We want to repleopattern = re.compianpattertupattern = re.compile(r   # We want to rep |
# ={# We want to re# ={# We want to replace ever   # We want to r  # ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.comperpatrupattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.compiin# We(s# We want to replace ever   # We want to repl',} # ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever [planetSize * structure.coreRadius, # ={# We want to re# ={# We want to replace ever   # We want to r  # ={# We want to replace ever   # We want to r  pattern = re.compiin# We want to resive={strupattern = re.comperpatrupattern = re.compile(r   # We want to rep |
# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # Wth# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattRa# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.com{s# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # Wth# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # We want to rep |
# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattRa# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.com{s# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # Wth# We wan} # ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattRa# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.c  # ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattRa# ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattern = re.com{s# We want to replace ever   # We want to repl',2,# We w/*# We want to repl Mpattern = re.compile(r   # Wth# We wan} # ={# We "# We want to replace everty={0.2} side={THRE# ={# We want to replace ever   # We want to r  pattRa</>
        ) : (
          <group
            onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('total_crust'); }}
            onPointerOut={(e) => { e.stopPropagation(); setHoveredLayer(null); }}
          >
            <mesh>
              <sphereGeometry args={[planetSize, 32, 32]} />
              <meshStandardMaterial map={textureUrl} color={color} />
              {hoveredLayer === 'total_crust' && <Edges color="#66AAFF" threshold={15} />}
            </mesh>
          </group>
        )}
      </group>"""

if pattern.search(text):
    text = pattern.sub(replacement, text)
    with open("src/app/solarsystem/components/Planet.tsx", "w") as f:
        f.write(text)
    print("Success")
else:
    print("Pattern not found!")
