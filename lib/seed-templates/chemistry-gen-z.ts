import { SeedTemplate } from './types';

export const chemistryGenZTemplate: SeedTemplate = {
  id: 'chemistry-gen-z',
  name: 'Chemistry 101 - Gen Z Edition',
  description: 'First quarter college chemistry with a modern twist',
  metadata: {
    interests: ['science', 'chemistry', 'STEM'],
    level: 'beginner',
    style: 'casual',
    targetAge: 'college'
  },
  folders: [
    {
      name: 'Chemistry 101 💜',
      color: 'bg-purple-500',
      notebooks: [
        {
          name: 'Atomic Structure & Periodic Table',
          color: 'bg-blue-100',
          notes: [
            {
              title: 'atoms are literally just vibes',
              content: `<p>ok so like atoms are basically the smallest unit of matter that still has the properties of an element... but honestly theyre mostly empty space which is kinda wild to think about</p>
              
              <p>the structure is pretty simple once u get it:</p>
              <ul>
                <li><strong>nucleus</strong> - the thicc center part with protons (positive bois) and neutrons (neutral squad)</li>
                <li><strong>electrons</strong> - the negative particles that zoom around the nucleus in "orbitals" (not orbits bc quantum mechanics said so)</li>
              </ul>
              
              <p>fun fact: if an atom was the size of a football stadium, the nucleus would be like a marble in the center. everything else? just electrons vibing in probability clouds 😵‍💫</p>
              
              <p>the number of protons = atomic number = what element it is. carbon always has 6 protons, oxygen always has 8, etc. neutrons can vary tho (thats how we get isotopes)</p>
              
              <p>wait why do electrons stay near the nucleus if theyre negative and the nucleus is positive? shouldnt they just yeet themselves into the center?? quantum mechanics: "its complicated" 🤷‍♀️</p>`
            },
            {
              title: 'electron config speedrun any%',
              content: `<p>electron configuration is just the address of where electrons live and lemme tell u its giving organized chaos</p>
              
              <p>the basics:</p>
              <ul>
                <li>electrons fill up orbitals in a specific order (aufbau principle)</li>
                <li>each orbital can hold max 2 electrons (pauli exclusion)</li>
                <li>electrons prefer to be single before pairing up (hunds rule) - relatable tbh</li>
              </ul>
              
              <p>orbital types and how many electrons they hold:</p>
              <ul>
                <li>s orbitals: 2 electrons (sphere shaped)</li>
                <li>p orbitals: 6 electrons (dumbbell shaped)</li>
                <li>d orbitals: 10 electrons (clover shaped mostly)</li>
                <li>f orbitals: 14 electrons (we dont talk about f orbital shapes)</li>
              </ul>
              
              <p>the order is: 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p... yeah its not intuitive at all</p>
              
              <p>example - carbon (6 electrons): 1s² 2s² 2p²</p>
              
              <p>noble gas notation is when ur too lazy to write the whole thing so u just put the last noble gas in brackets. like iron: [Ar] 4s² 3d⁶ instead of writing out all 26 electrons</p>
              
              <p>tbh i still dont get why 4s fills before 3d... something about energy levels but make it make sense??? 🤔</p>`
            }
          ]
        },
        {
          name: 'Chemical Bonding',
          color: 'bg-green-100',
          notes: [
            {
              title: 'ionic vs covalent: the ultimate showdown',
              content: `<p>chemical bonds are how atoms become besties and stick together. there's mainly 2 types and they got VERY different vibes</p>
              
              <h3>ionic bonds - the theft relationship 🏴‍☠️</h3>
              <p>one atom straight up STEALS electrons from another atom. usually happens between:</p>
              <ul>
                <li>metals (they simp for losing electrons)</li>
                <li>nonmetals (electron hoarders fr)</li>
              </ul>
              
              <p>example: NaCl (table salt)</p>
              <p>sodium: "here take my electron i dont want it"</p>
              <p>chlorine: "dont mind if i do 😈"</p>
              
              <p>now sodium is Na+ and chlorine is Cl- and theyre stuck together by electrostatic attraction (opposites attract literally)</p>
              
              <h3>covalent bonds - the sharing is caring type 🤝</h3>
              <p>atoms SHARE electrons instead of stealing. happens between nonmetals usually</p>
              
              <p>types:</p>
              <ul>
                <li>single bond: sharing 1 pair (C-C)</li>
                <li>double bond: sharing 2 pairs (C=C)</li>
                <li>triple bond: sharing 3 pairs (C≡C) - clingy much?</li>
              </ul>
              
              <p>water (H2O) is covalent - oxygen shares electrons with 2 hydrogens but oxygen is kinda greedy so the electrons hang out near oxygen more (polar covalent)</p>
              
              <p>wait so how do u know if somethings ionic or covalent?? electronegativity difference but like... i just memorize common ones ngl 💀</p>`
            },
            {
              title: 'VSEPR theory (molecules be shapeshifting)',
              content: `<p>VSEPR = Valence Shell Electron Pair Repulsion which is fancy talk for "electrons hate each other and want personal space"</p>
              
              <p>the whole theory: electron pairs around an atom arrange themselves to be as far apart as possible bc they're all negative and repel each other. makes sense but the shapes get weird</p>
              
              <p>common molecular shapes:</p>
              <ul>
                <li><strong>linear</strong> - 180° apart (like CO2) straight as an arrow</li>
                <li><strong>bent</strong> - less than 180° (like H2O) looks like a boomerang</li>
                <li><strong>trigonal planar</strong> - 120° apart, flat triangle (BF3)</li>
                <li><strong>tetrahedral</strong> - 109.5° apart, 3D triangle (CH4) minecraft diamond shape</li>
                <li><strong>trigonal pyramidal</strong> - like tetrahedral but one corner is just electrons (NH3)</li>
              </ul>
              
              <p>lone pairs are electrons that arent in bonds and they take up MORE space than bonding pairs which is rude tbh. thats why water is bent not linear even tho it has 2 bonds</p>
              
              <p>steps to find shape:</p>
              <ol>
                <li>draw lewis structure</li>
                <li>count electron groups (bonds + lone pairs)</li>
                <li>figure out geometry based on number</li>
                <li>??? </li>
                <li>profit</li>
              </ol>
              
              <p>why tf is it called VSEPR and not like... electron personal space theory??? chemists love their acronyms i guess</p>`
            }
          ]
        },
        {
          name: 'Stoichiometry',
          color: 'bg-yellow-100',
          notes: [
            {
              title: 'mole calculations got me like 😵',
              content: `<p>ok so a mole is NOT the animal... its just a really big number: 6.022 x 10²³ (avogadros number)</p>
              
              <p>why do we need moles? bc atoms are TINY and we need a way to count them in reasonable amounts. its like how a dozen = 12, except a mole = 602,200,000,000,000,000,000,000 💀</p>
              
              <p>the magic formula triangle:</p>
              <ul>
                <li>moles = mass / molar mass</li>
                <li>mass = moles × molar mass</li>
                <li>molar mass = mass / moles</li>
              </ul>
              
              <p>molar mass = add up all the atomic masses from the periodic table</p>
              <p>example: H2O = 2(1.01) + 16.00 = 18.02 g/mol</p>
              
              <p>conversion roadmap:</p>
              <p>grams ↔️ moles ↔️ molecules/atoms</p>
              <p>use molar mass for the first arrow, use avogadros number for the second</p>
              
              <p>example problem: how many molecules in 36g of water?</p>
              <ol>
                <li>36g H2O × (1 mol / 18.02g) = 2 mol H2O</li>
                <li>2 mol × 6.022×10²³ = 1.2×10²⁴ molecules</li>
              </ol>
              
              <p>my brain during mole problems: "wait did i divide or multiply there?? let me start over..." x10</p>
              
              <p>pro tip: ALWAYS write units and cancel them out. if ur units dont work out, ur doing it wrong bestie</p>`
            },
            {
              title: 'limiting reagents are the WORST',
              content: `<p>limiting reagent = the reactant that runs out first and ruins the party for everyone else 😤</p>
              
              <p>think of it like making sandwiches:</p>
              <ul>
                <li>u got 10 slices of bread and 3 slices of cheese</li>
                <li>each sandwich needs 2 bread + 1 cheese</li>
                <li>u can only make 3 sandwiches bc u run out of cheese</li>
                <li>cheese = limiting reagent, bread = excess reagent</li>
              </ul>
              
              <p>steps to find limiting reagent:</p>
              <ol>
                <li>convert everything to moles (ugh)</li>
                <li>divide moles by coefficient from balanced equation</li>
                <li>smallest number = limiting reagent</li>
                <li>use limiting reagent for all further calculations</li>
              </ol>
              
              <p>example: 2H2 + O2 → 2H2O</p>
              <p>if u got 4 mol H2 and 3 mol O2:</p>
              <ul>
                <li>H2: 4 mol / 2 = 2</li>
                <li>O2: 3 mol / 1 = 3</li>
                <li>H2 has smaller number so its limiting</li>
              </ul>
              
              <p>percent yield = (actual/theoretical) × 100%</p>
              <p>actual = what u really got in lab (usually less bc life)</p>
              <p>theoretical = what u calculated u should get</p>
              
              <p>why is my percent yield 127%?? oh wait i forgot to dry my product... water weight strikes again 🤦‍♀️</p>`
            }
          ]
        },
        {
          name: 'Gas Laws & Thermodynamics',
          color: 'bg-red-100',
          notes: [
            {
              title: 'PV=nRT and other math nightmares',
              content: `<p>ideal gas law: PV = nRT (the most important equation after F=ma probably)</p>
              
              <p>what it all means:</p>
              <ul>
                <li>P = pressure (in atm usually)</li>
                <li>V = volume (in liters)</li>
                <li>n = moles of gas</li>
                <li>R = gas constant (0.0821 L·atm/mol·K)</li>
                <li>T = temperature (IN KELVIN!! not celsius!!)</li>
              </ul>
              
              <p>ALWAYS CONVERT TO KELVIN: K = °C + 273.15 (i forget this every. single. time.)</p>
              
              <p>other gas laws (the ideal gas law's cousins):</p>
              <ul>
                <li><strong>boyles law</strong>: P1V1 = P2V2 (pressure and volume are inversely related)</li>
                <li><strong>charles law</strong>: V1/T1 = V2/T2 (volume and temp are buddies)</li>
                <li><strong>gay-lussacs law</strong>: P1/T1 = P2/T2 (pressure and temp also buddies)</li>
              </ul>
              
              <p>combined gas law brings them all together: P1V1/T1 = P2V2/T2</p>
              
              <p>STP = standard temp and pressure = 0°C (273K) and 1 atm. at STP, 1 mol of any gas = 22.4 L (memorize this it shows up everywhere)</p>
              
              <p>real gases vs ideal gases: ideal gases are like perfect students who follow all the rules. real gases are... real. they deviate at high pressure and low temp bc molecules actually take up space and attract each other</p>
              
              <p>why is it called "ideal" anyway... nothing ideal about doing these calculations at 2am 😩</p>`
            },
            {
              title: 'entropy: why my room stays messy',
              content: `<p>thermodynamics is about energy and where it goes. spoiler: it usually goes to chaos</p>
              
              <h3>the laws (simplified):</h3>
              <ul>
                <li><strong>1st law</strong>: energy cant be created or destroyed (conservation of energy). boring but important</li>
                <li><strong>2nd law</strong>: entropy (disorder) always increases. this is why everything falls apart eventually</li>
                <li><strong>3rd law</strong>: at absolute zero, perfect crystals have zero entropy. good luck reaching absolute zero tho</li>
              </ul>
              
              <p>entropy (S) = measure of randomness/disorder</p>
              <ul>
                <li>gas > liquid > solid (in terms of entropy)</li>
                <li>hot things have more entropy than cold things</li>
                <li>mixed things have more entropy than separated things</li>
              </ul>
              
              <p>my room is a perfect example of entropy increase. it naturally goes from clean → messy without me doing anything. going from messy → clean requires energy input (me cleaning) 😮‍💨</p>
              
              <p>gibbs free energy: ΔG = ΔH - TΔS</p>
              <ul>
                <li>ΔG < 0: spontaneous (happens on its own)</li>
                <li>ΔG > 0: nonspontaneous (needs energy input)</li>
                <li>ΔG = 0: at equilibrium</li>
              </ul>
              
              <p>enthalpy (H) = heat content. exothermic reactions release heat (ΔH < 0), endothermic reactions absorb heat (ΔH > 0)</p>
              
              <p>why is ice melting spontaneous at room temp even tho it needs heat?? bc the entropy increase is so big it overcomes the positive ΔH. thermodynamics is wild</p>
              
              <p>honestly the 2nd law of thermo explains why:</p>
              <ul>
                <li>my earbuds always get tangled</li>
                <li>my notes get messier over the semester</li>
                <li>everything eventually breaks</li>
                <li>life is suffering??? (jk... unless? 👀)</li>
              </ul>`
            }
          ]
        }
      ]
    }
  ]
};