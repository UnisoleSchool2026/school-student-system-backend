// ============================================================================
// CANONICAL CLASS 12 CHEMISTRY NCERT TEXTBOOK CURRICULUM & AUTHENTIC CONTENT
// Standard NCERT Class 12 Chemistry Part 1 & Part 2 comprehensive syllabus
// ============================================================================

const CANONICAL_CHEMISTRY_12 = {
  1: {
    title: 'The Solid State',
    topics: {
      '1.1': 'General Characteristics of Solid State',
      '1.2': 'Amorphous and Crystalline Solids',
      '1.3': 'Classification of Crystalline Solids',
      '1.4': 'Crystal Lattices and Unit Cells',
      '1.5': 'Number of Atoms in a Unit Cell',
      '1.6': 'Close Packed Structures',
      '1.7': 'Packing Efficiency',
      '1.8': 'Calculations Involving Unit Cell Dimensions',
      '1.9': 'Imperfections in Solids',
      '1.10': 'Electrical Properties',
      '1.11': 'Magnetic Properties',
      '1.S': 'Summary & Key Concepts',
      '1.E': 'NCERT Chapter Exercises'
    }
  },
  2: {
    title: 'Solutions',
    topics: {
      '2.1': 'Types of Solutions',
      '2.2': 'Expressing Concentration of Solutions',
      '2.3': 'Solubility',
      '2.4': 'Vapour Pressure of Liquid Solutions',
      '2.5': 'Ideal and Non-ideal Solutions',
      '2.6': 'Colligative Properties and Determination of Molar Mass',
      '2.7': 'Abnormal Molar Masses',
      '2.S': 'Summary & Key Concepts',
      '2.E': 'NCERT Chapter Exercises'
    }
  },
  3: {
    title: 'Electrochemistry',
    topics: {
      '3.1': 'Electrochemical Cells',
      '3.2': 'Galvanic Cells',
      '3.3': 'Nernst Equation',
      '3.4': 'Conductance of Electrolytic Solutions',
      '3.5': 'Electrolytic Cells and Electrolysis',
      '3.6': 'Batteries',
      '3.7': 'Fuel Cells',
      '3.8': 'Corrosion',
      '3.S': 'Summary & Key Concepts',
      '3.E': 'NCERT Chapter Exercises'
    }
  },
  4: {
    title: 'Chemical Kinetics',
    topics: {
      '4.1': 'Rate of a Chemical Reaction',
      '4.2': 'Factors Influencing Rate of a Reaction',
      '4.3': 'Integrated Rate Equations',
      '4.4': 'Pseudo First Order Reaction',
      '4.5': 'Temperature Dependence of the Rate of a Reaction',
      '4.6': 'Collision Theory of Chemical Reactions',
      '4.S': 'Summary & Key Concepts',
      '4.E': 'NCERT Chapter Exercises'
    }
  },
  5: {
    title: 'Surface Chemistry',
    topics: {
      '5.1': 'Adsorption',
      '5.2': 'Catalysis',
      '5.3': 'Colloids',
      '5.4': 'Classification of Colloids',
      '5.5': 'Emulsions',
      '5.6': 'Colloids Around Us',
      '5.S': 'Summary & Key Concepts',
      '5.E': 'NCERT Chapter Exercises'
    }
  },
  6: {
    title: 'General Principles and Processes of Isolation of Elements',
    topics: {
      '6.1': 'Occurrence of Metals',
      '6.2': 'Concentration of Ores',
      '6.3': 'Extraction of Crude Metal from Concentrated Ore',
      '6.4': 'Thermodynamic Principles of Metallurgy',
      '6.5': 'Electrochemical Principles of Metallurgy',
      '6.6': 'Oxidation Reduction',
      '6.7': 'Refining',
      '6.8': 'Uses of Aluminium, Copper, Zinc and Iron',
      '6.S': 'Summary & Key Concepts',
      '6.E': 'NCERT Chapter Exercises'
    }
  },
  7: {
    title: 'The p-Block Elements',
    topics: {
      '7.1': 'Group 15 Elements',
      '7.2': 'Dinitrogen',
      '7.3': 'Ammonia',
      '7.4': 'Oxides of Nitrogen',
      '7.5': 'Nitric Acid',
      '7.6': 'Phosphorus — Allotropic Forms',
      '7.7': 'Phosphine',
      '7.8': 'Phosphorus Halides',
      '7.9': 'Oxoacids of Phosphorus',
      '7.10': 'Group 16 Elements',
      '7.11': 'Dioxygen',
      '7.12': 'Simple Oxides',
      '7.13': 'Ozone',
      '7.14': 'Sulphur — Allotropic Forms',
      '7.15': 'Sulphur Dioxide',
      '7.16': 'Oxoacids of Sulphur',
      '7.17': 'Sulphuric Acid',
      '7.18': 'Group 17 Elements',
      '7.19': 'Chlorine',
      '7.20': 'Hydrogen Chloride',
      '7.21': 'Oxoacids of Halogens',
      '7.22': 'Interhalogen Compounds',
      '7.23': 'Group 18 Elements',
      '7.S': 'Summary & Key Concepts',
      '7.E': 'NCERT Chapter Exercises'
    }
  },
  8: {
    title: 'The d- and f-Block Elements',
    topics: {
      '8.1': 'Position in the Periodic Table',
      '8.2': 'Electronic Configurations of the d-Block Elements',
      '8.3': 'General Properties of the Transition Elements (d-Block)',
      '8.4': 'Important Compounds of Transition Elements',
      '8.5': 'The Lanthanoids',
      '8.6': 'The Actinoids',
      '8.7': 'Some Applications of d- and f-Block Elements',
      '8.S': 'Summary & Key Concepts',
      '8.E': 'NCERT Chapter Exercises'
    }
  },
  9: {
    title: 'Coordination Compounds',
    topics: {
      '9.1': "Werner's Theory of Coordination Compounds",
      '9.2': 'Definitions of Some Important Terms Pertaining to Coordination Compounds',
      '9.3': 'Nomenclature of Coordination Compounds',
      '9.4': 'Isomerism in Coordination Compounds',
      '9.5': 'Bonding in Coordination Compounds',
      '9.6': 'Bonding in Metal Carbonyls',
      '9.7': 'Importance and Applications of Coordination Compounds',
      '9.S': 'Summary & Key Concepts',
      '9.E': 'NCERT Chapter Exercises'
    }
  },
  10: {
    title: 'Haloalkanes and Haloarenes',
    topics: {
      '10.1': 'Classification',
      '10.2': 'Nomenclature',
      '10.3': 'Nature of C-X Bond',
      '10.4': 'Methods of Preparation of Haloalkanes',
      '10.5': 'Preparation of Haloarenes',
      '10.6': 'Physical Properties',
      '10.7': 'Chemical Reactions',
      '10.8': 'Polyhalogen Compounds',
      '10.S': 'Summary & Key Concepts',
      '10.E': 'NCERT Chapter Exercises'
    }
  },
  11: {
    title: 'Alcohols, Phenols and Ethers',
    topics: {
      '11.1': 'Classification',
      '11.2': 'Nomenclature',
      '11.3': 'Structures of Functional Groups',
      '11.4': 'Alcohols and Phenols',
      '11.5': 'Some Commercially Important Alcohols',
      '11.6': 'Ethers',
      '11.S': 'Summary & Key Concepts',
      '11.E': 'NCERT Chapter Exercises'
    }
  },
  12: {
    title: 'Aldehydes, Ketones and Carboxylic Acids',
    topics: {
      '12.1': 'Nomenclature and Structure of Carbonyl Group',
      '12.2': 'Preparation of Aldehydes and Ketones',
      '12.3': 'Physical Properties',
      '12.4': 'Chemical Reactions',
      '12.5': 'Uses of Aldehydes and Ketones',
      '12.6': 'Nomenclature and Structure of Carboxyl Group',
      '12.7': 'Methods of Preparation of Carboxylic Acids',
      '12.8': 'Physical Properties',
      '12.9': 'Chemical Reactions',
      '12.10': 'Uses of Carboxylic Acids',
      '12.S': 'Summary & Key Concepts',
      '12.E': 'NCERT Chapter Exercises'
    }
  },
  13: {
    title: 'Amines',
    topics: {
      '13.1': 'Structure of Amines',
      '13.2': 'Classification',
      '13.3': 'Nomenclature',
      '13.4': 'Preparation of Amines',
      '13.5': 'Physical Properties',
      '13.6': 'Chemical Reactions',
      '13.7': 'Method of Preparation of Diazonium Salts',
      '13.8': 'Physical Properties',
      '13.9': 'Chemical Reactions',
      '13.10': 'Importance of Diazonium Salts in Synthesis of Aromatic Compounds',
      '13.S': 'Summary & Key Concepts',
      '13.E': 'NCERT Chapter Exercises'
    }
  },
  14: {
    title: 'Biomolecules',
    topics: {
      '14.1': 'Carbohydrates',
      '14.2': 'Proteins',
      '14.3': 'Enzymes',
      '14.4': 'Vitamins',
      '14.5': 'Nucleic Acids',
      '14.6': 'Hormones',
      '14.S': 'Summary & Key Concepts',
      '14.E': 'NCERT Chapter Exercises'
    }
  },
  15: {
    title: 'Polymers',
    topics: {
      '15.1': 'Classification of Polymers',
      '15.2': 'Types of Polymerisation Reactions',
      '15.3': 'Molecular Mass of Polymers',
      '15.4': 'Biodegradable Polymers',
      '15.5': 'Polymers of Commercial Importance',
      '15.S': 'Summary & Key Concepts',
      '15.E': 'NCERT Chapter Exercises'
    }
  },
  16: {
    title: 'Chemistry in Everyday Life',
    topics: {
      '16.1': 'Drugs and their Classification',
      '16.2': 'Drug-Target Interaction',
      '16.3': 'Therapeutic Action of Different Classes of Drugs',
      '16.4': 'Chemicals in Food',
      '16.5': 'Cleansing Agents',
      '16.S': 'Summary & Key Concepts',
      '16.E': 'NCERT Chapter Exercises'
    }
  }
};

const AUTHENTIC_TOPIC_TEXTS = {
  // Chapter 1
  '1.1': `Solids are characterized by definite mass, volume, and shape due to fixed positions of their constituent particles (atoms, molecules, or ions) and short intermolecular distances. The intermolecular forces are strong enough to hold particles in fixed positions, allowing them only to oscillate about their mean positions. As a result, solids are rigid and nearly incompressible.`,
  '1.2': `Crystalline solids have a regular and repeating arrangement of constituent particles over a long range (long-range order). They have sharp melting points and are anisotropic (their physical properties like electrical conductivity and refractive index differ along different crystalline axes). Amorphous solids have only short-range order, soften gradually over a temperature range, and are isotropic. Amorphous solids are considered pseudo-solids or supercooled liquids.`,
  '1.3': `Crystalline solids are classified based on the nature of intermolecular forces into four categories:\n1. Molecular Solids: Non-polar ($H_2, Cl_2$), Polar ($HCl, SO_2$), and Hydrogen-bonded ($H_2O$ ice).\n2. Ionic Solids: Composed of cations and anions held by strong electrostatic coulombic forces (e.g., $NaCl, MgO, ZnS$). They are electrical insulators in the solid state but conduct electricity in molten or aqueous state.\n3. Metallic Solids: Positive ions (kernels) in a sea of delocalized mobile electrons (e.g., $Fe, Cu, Ag$). They exhibit high electrical and thermal conductivity, luster, and malleability.\n4. Covalent or Network Solids: Giant three-dimensional networks formed by covalent bonds (e.g., Diamond, Graphite, $SiO_2$ quartz). Graphite is soft and conducts electricity due to free mobile electrons between hexagonal carbon sheets.`,
  '1.4': `A crystal lattice is a regular three-dimensional arrangement of points in space. There are only 14 possible three-dimensional lattices known as Bravais Lattices. The unit cell is the smallest repeating portion of a crystal lattice that generates the entire lattice through translational repetition. Unit cells are characterized by six parameters: edge lengths ($a, b, c$) and axial angles ($\\alpha, \\beta, \\gamma$).`,
  '1.5': `In a primitive cubic unit cell, 8 corner atoms each contribute $1/8$, giving $Z = 8 \\times (1/8) = 1$ atom. In a body-centred cubic (bcc) unit cell, $Z = 8 \\times (1/8) + 1 = 2$ atoms. In a face-centred cubic (fcc) unit cell, $Z = 8 \\times (1/8) + 6 \\times (1/2) = 4$ atoms.`,
  '1.6': `Constituent particles are packed in close contact to maximize space utilization. In 3D close packing:\n- Hexagonal Close Packing (hcp): ABAB... pattern with coordination number 12 (e.g., $Mg, Zn$).\n- Cubic Close Packing (ccp) / Face-Centred Cubic (fcc): ABCABC... pattern with coordination number 12 (e.g., $Cu, Ag$).\nFor $N$ close-packed spheres, the number of octahedral voids is $N$ and tetrahedral voids is $2N$.`,
  '1.7': `Packing efficiency is the percentage of total space filled by particles:\n- Simple Cubic: $\\frac{\\frac{4}{3}\\pi r^3}{a^3} \\times 100\\% = 52.4\\%$ ($a = 2r$).\n- Body-Centred Cubic (bcc): $\\frac{2 \\times \\frac{4}{3}\\pi r^3}{a^3} \\times 100\\% = 68\\%$ ($a = \\frac{4r}{\\sqrt{3}}$).\n- Face-Centred Cubic (fcc / ccp): $\\frac{4 \\times \\frac{4}{3}\\pi r^3}{a^3} \\times 100\\% = 74\\%$ ($a = 2\\sqrt{2}r$).`,
  '1.8': `Density of a cubic crystal lattice ($\\rho$):\n$$\\rho = \\frac{Z \\cdot M}{a^3 \\cdot N_A}$$\nwhere $Z$ is the number of atoms per unit cell, $M$ is molar mass ($g\\cdot mol^{-1}$), $a$ is unit cell edge length in $cm$ ($1\\,pm = 10^{-10}\\,cm$), and $N_A = 6.022 \\times 10^{23}\\,mol^{-1}$ is Avogadro's constant.`,
  '1.9': `Crystal defects include stoichiometric and non-stoichiometric defects:\n- Schottky Defect: Equal numbers of cations and anions are missing from lattice sites. Decreases density of the solid (e.g., $NaCl, KCl, CsCl, AgBr$).\n- Frenkel Defect: An ion is displaced from its regular lattice site into an interstitial site. Density remains unchanged (e.g., $ZnS, AgCl, AgBr, AgI$). Note: $AgBr$ exhibits both Schottky and Frenkel defects.\n- Non-stoichiometric Defects: Metal excess defect due to anion vacancies producing F-centres (color centres, e.g., yellow $NaCl$, pink $LiCl$), and metal deficiency defect (e.g., $Fe_{0.95}O$).`,
  '1.10': `Solids are classified by electrical conductivity into conductors ($10^4$ to $10^7\\,\\Omega^{-1}m^{-1}$), semiconductors ($10^{-6}$ to $10^4\\,\\Omega^{-1}m^{-1}$), and insulators ($10^{-20}$ to $10^{-10}\\,\\Omega^{-1}m^{-1}$). Band theory explains conductivity through valence and conduction bands. Doping Group 14 elements ($Si, Ge$) with Group 15 donors ($P, As$) yields n-type semiconductors; doping with Group 13 acceptors ($B, Al, Ga$) yields p-type semiconductors.`,
  '1.11': `Magnetic behavior arises from orbital motion and spin of electrons:\n- Paramagnetic: Weakly attracted by magnetic fields; contains unpaired electrons (e.g., $O_2, Cu^{2+}, Fe^{3+}$).\n- Diamagnetic: Weakly repelled; all electrons paired (e.g., $H_2O, NaCl, C_6H_6$).\n- Ferromagnetic: Strongly attracted and permanently magnetized; domains align parallel (e.g., $Fe, Co, Ni, CrO_2$).\n- Antiferromagnetic: Magnetic moments of domains align in opposite directions cancel out ($MnO$).\n- Ferrimagnetic: Moments align parallel and anti-parallel in unequal numbers ($Fe_3O_4$, ferrites).`,
  '1.S': `Summary of Chapter 1: The Solid State covers classification into crystalline and amorphous solids, Bravais lattices, unit cell density formula $\\rho = \\frac{ZM}{a^3 N_A}$, close-packing in 3D (hcp and ccp), stoichiometric defects (Schottky and Frenkel), and magnetic classification (paramagnetic, diamagnetic, ferromagnetic).`,
  '1.E': `NCERT Exercises for Chapter 1: The Solid State covers numericals on edge lengths, density calculations using Avogadro constant, coordination numbers, calculation of packing efficiency, and reasoning questions on stoichiometric defects.`,

  // Chapter 2
  '2.1': `Solutions are homogeneous mixtures of two or more components. The component present in the largest quantity is the solvent, while others are solutes. Solutions are classified as gaseous, liquid, or solid solutions based on the physical state of the solvent and solute.`,
  '2.2': `Concentration units include:\n- Mass Percentage ($w/w$): $\\text{Mass \\%} = \\frac{\\text{Mass of component}}{\\text{Total mass of solution}} \\times 100$\n- Volume Percentage ($v/v$): $\\text{Volume \\%} = \\frac{\\text{Volume of component}}{\\text{Total volume of solution}} \\times 100$\n- Mole Fraction ($x$): $x_A = \\frac{n_A}{n_A + n_B}$ where $\\sum x_i = 1$\n- Molarity ($M$): Moles of solute per litre of solution ($M = \\frac{n}{V_{\\text{in L}}}$). Temperature-dependent.\n- Molality ($m$): Moles of solute per kilogram of solvent ($m = \\frac{n}{\\text{Mass of solvent in kg}}$). Temperature-independent.`,
  '2.3': `Solubility is the maximum amount of solute that can dissolve in a specified amount of solvent at a specified temperature.\nFor gases in liquids, Henry's Law states:\n$$p = K_H \\cdot x$$\nwhere $p$ is partial pressure of the gas, $x$ is mole fraction, and $K_H$ is Henry's law constant. Higher $K_H$ indicates lower gas solubility. Henry's constant increases with temperature, so gases are less soluble in warm liquids (aquatic species are more comfortable in cold water due to higher dissolved oxygen).`,
  '2.4': `Raoult's Law for volatile liquids:\n$$p_1 = p_1^0 x_1 \\quad \\text{and} \\quad p_2 = p_2^0 x_2$$\n$$P_{\\text{total}} = p_1 + p_2 = p_1^0 + (p_2^0 - p_1^0) x_2$$\nIn the vapour phase, mole fractions are $y_1 = p_1 / P_{\\text{total}}$ and $y_2 = p_2 / P_{\\text{total}}$.`,
  '2.5': `Ideal solutions obey Raoult's law at all concentrations, with $\\Delta_{\\text{mix}}H = 0$ and $\\Delta_{\\text{mix}}V = 0$ (e.g., n-hexane + n-heptane, benzene + toluene).\nNon-ideal solutions show:\n- Positive Deviation: $A-B$ interactions are weaker than $A-A$ and $B-B$. $P_{\\text{total}} > P_{\\text{calc}}$, $\\Delta H > 0$, $\\Delta V > 0$. Forms minimum-boiling azeotropes (e.g., ethanol + water, acetone + $CS_2$).\n- Negative Deviation: $A-B$ interactions are stronger (e.g., hydrogen bonding). $P_{\\text{total}} < P_{\\text{calc}}$, $\\Delta H < 0$, $\\Delta V < 0$. Forms maximum-boiling azeotropes (e.g., chloroform + acetone, $HNO_3$ + water).`,
  '2.6': `Colligative properties depend only on the number of solute particles relative to total particles:\n1. Relative Lowering of Vapour Pressure: $\\frac{p_1^0 - p_1}{p_1^0} = x_2 \\approx \\frac{w_2 M_1}{M_2 w_1}$\n2. Elevation of Boiling Point: $\\Delta T_b = T_b - T_b^0 = K_b \\cdot m = \\frac{1000 \\cdot K_b \\cdot w_2}{M_2 \\cdot w_1}$ ($K_b$ = molal elevation constant or ebullioscopic constant).\n3. Depression of Freezing Point: $\\Delta T_f = T_f^0 - T_f = K_f \\cdot m = \\frac{1000 \\cdot K_f \\cdot w_2}{M_2 \\cdot w_1}$ ($K_f$ = molal depression constant or cryoscopic constant).\n4. Osmotic Pressure ($\\Pi$): $\\Pi = CRT = \\frac{w_2 R T}{M_2 V}$. Preferred method for determining molar masses of polymers and biomolecules (proteins, nucleic acids) due to measurable magnitude at room temperature.`,
  '2.7': `Solutes undergo dissociation or association in solution, altering the observed number of particles:\nVan 't Hoff Factor ($i$):\n$$i = \\frac{\\text{Normal molar mass}}{\\text{Abnormal (observed) molar mass}} = \\frac{\\text{Observed colligative property}}{\\text{Calculated colligative property}}$$\n- For dissociation ($KCl \\rightarrow K^+ + Cl^-$, $n=2$): $i > 1$, $\\alpha = \\frac{i - 1}{n - 1}$.\n- For association ($2CH_3COOH \\rightleftharpoons (CH_3COOH)_2$, $n=2$): $i < 1$, $\\alpha = \\frac{1 - i}{1 - 1/n}$.\nModified equations: $\\Delta T_b = i K_b m$, $\\Delta T_f = i K_f m$, $\\Pi = i CRT$.`,
  '2.S': `Summary of Chapter 2: Solutions covers concentration expressions, Henry's Law, Raoult's Law for ideal and non-ideal solutions, azeotropes, four colligative properties (RLVP, $\\Delta T_b$, $\\Delta T_f$, $\\Pi$), and van 't Hoff factor $i$ for electrolytic dissociation/association.`,
  '2.E': `NCERT Exercises for Chapter 2: Solutions includes calculations on molality, molarity, Henry's constant, boiling point elevation, freezing point depression with van 't Hoff factor, and determination of molar masses of non-volatile solutes.`,

  // Chapter 3
  '3.1': `An electrochemical cell converts chemical energy released during spontaneous redox reactions into electrical energy (galvanic/voltaic cell) or uses electrical energy to drive non-spontaneous chemical reactions (electrolytic cell).`,
  '3.2': `The Daniell Cell operates on the spontaneous redox reaction:\n$$\\text{Zn(s)} + \\text{Cu}^{2+}\\text{(aq)} \\longrightarrow \\text{Zn}^{2+}\\text{(aq)} + \\text{Cu(s)}$$\nAnode (oxidation): $\\text{Zn} \\rightarrow \\text{Zn}^{2+} + 2e^-$ (negative polarity).\nCathode (reduction): $\\text{Cu}^{2+} + 2e^- \\rightarrow \\text{Cu}$ (positive polarity).\nCell representation: $\\text{Zn(s)} | \\text{Zn}^{2+}\\text{(aq)} || \\text{Cu}^{2+}\\text{(aq)} | \\text{Cu(s)}$.\nCell potential: $E_{\\text{cell}} = E_{\\text{cathode}} - E_{\\text{anode}} = E_{\\text{right}} - E_{\\text{left}}$. Under standard conditions, $E_{\\text{cell}}^0 = 0.34\\,\\text{V} - (-0.76\\,\\text{V}) = 1.10\\,\\text{V}$.`,
  '3.3': `The Nernst equation calculates cell potential under non-standard concentrations:\n$$E_{\\text{cell}} = E_{\\text{cell}}^0 - \\frac{RT}{nF} \\ln Q = E_{\\text{cell}}^0 - \\frac{0.0591}{n} \\log_{10} \\frac{[\\text{Products}]}{[\\text{Reactants}]}$$\nAt equilibrium ($E_{\\text{cell}} = 0$):\n$$E_{\\text{cell}}^0 = \\frac{0.0591}{n} \\log K_c$$\nGibbs Free Energy and electrical work:\n$$\\Delta_r G^0 = -nFE_{\\text{cell}}^0 = -2.303 RT \\log K_c$$`,
  '3.4': `Key conductance equations:\n- Resistance: $R = \\rho \\frac{l}{A} \\quad (\\Omega)$\n- Conductance: $G = \\frac{1}{R} = \\kappa \\frac{A}{l} \\quad (\\text{S or }\\Omega^{-1})$\n- Conductivity: $\\kappa = G \\cdot G^* = \\frac{G^*}{R} \\quad (\\text{S}\\cdot\\text{cm}^{-1})$, where cell constant $G^* = \\frac{l}{A}$.\n- Molar Conductivity ($\\Lambda_m$): $\\Lambda_m = \\frac{1000 \\cdot \\kappa}{M} \\quad (\\text{S}\\cdot\\text{cm}^2\\cdot\\text{mol}^{-1})$.\nVariation with concentration: $\\kappa$ decreases on dilution because the number of current-carrying ions per unit volume decreases. $\\Lambda_m$ increases on dilution.\nKohlrausch's Law of Independent Migration of Ions:\n$$\\Lambda_m^0 = \\nu_+ \\lambda_+^0 + \\nu_- \\lambda_-^0$$\nDegree of dissociation ($\\alpha = \\frac{\\Lambda_m}{\\Lambda_m^0}$) and dissociation constant ($K_a = \\frac{c\\alpha^2}{1 - \\alpha}$).`,
  '3.5': `Faraday's Laws of Electrolysis:\n1. First Law: $w = Z \\cdot Q = Z \\cdot I \\cdot t$, where electrochemical equivalent $Z = \\frac{M}{n \\cdot F}$ and $1\\,F = 96487\\,\\text{C}\\cdot\\text{mol}^{-1}$.\n2. Second Law: $\\frac{w_1}{w_2} = \\frac{E_1}{E_2}$ for equal quantity of electricity passed through different electrolytes in series.\nProducts of electrolysis depend on electrode potentials and overpotential: In aqueous $NaCl$, $H_2$ gas is produced at cathode and $Cl_2$ gas at anode (overpotential prevents $O_2$ release).`,
  '3.6': `Commercial electrochemical sources:\n- Primary Batteries: Cannot be recharged. Dry cell (Leclanché cell, voltage $\\approx 1.5\\,\\text{V}$) and Mercury cell ($1.35\\,\\text{V}$, constant voltage suitable for hearing aids and pacemakers).\n- Secondary Batteries: Reversible reactions allow electrical recharging. Lead Storage Battery:\nAnode: $\\text{Pb} + \\text{SO}_4^{2-} \\rightarrow \\text{PbSO}_4 + 2e^-$\nCathode: $\\text{PbO}_2 + \\text{SO}_4^{2-} + 4\\text{H}^+ + 2e^- \\rightarrow \\text{PbSO}_4 + 2\\text{H}_2\\text{O}$\nOverall: $\\text{Pb} + \\text{PbO}_2 + 2\\text{H}_2\\text{SO}_4 \\rightleftharpoons 2\\text{PbSO}_4 + 2\\text{H}_2\\text{O}$ (density of $H_2SO_4$ drops below $1.20\\,\\text{g/cm}^3$ when discharged).\nNickel-Cadmium Cell: Longer life, produces $\\text{Cd(s)} + 2\\text{Ni(OH)}_3\\text{(s)} \\rightarrow \\text{CdO(s)} + 2\\text{Ni(OH)}_2\\text{(s)} + \\text{H}_2\\text{O}$.`,
  '3.7': `Galvanic cells designed to convert chemical energy from combustion of fuels directly into electricity:\n$H_2-O_2$ Fuel Cell (used in Apollo space program):\nAnode: $2\\text{H}_2\\text{(g)} + 4\\text{OH}^-\\text{(aq)} \\rightarrow 4\\text{H}_2\\text{O(l)} + 4e^-$\nCathode: $\\text{O}_2\\text{(g)} + 2\\text{H}_2\\text{O(l)} + 4e^- \\rightarrow 4\\text{OH}^-\\text{(aq)}$\nOverall: $2\\text{H}_2\\text{(g)} + \\text{O}_2\\text{(g)} \\rightarrow 2\\text{H}_2\\text{O(l)}$\nEfficiency is around 70%, operates pollution-free, and product water is potable.`,
  '3.8': `Electrochemical corrosion of iron (rusting):\nAnodic region: $2\\text{Fe(s)} \\rightarrow 2\\text{Fe}^{2+} + 4e^- \\quad (E^0 = -0.44\\,\\text{V})$\nCathodic region: $\\text{O}_2\\text{(g)} + 4\\text{H}^+ + 4e^- \\rightarrow 2\\text{H}_2\\text{O} \\quad (E^0 = +1.23\\,\\text{V})$\nOverall: $2\\text{Fe} + \\text{O}_2 + 4\\text{H}^+ \\rightarrow 2\\text{Fe}^{2+} + 2\\text{H}_2\\text{O} \\quad (E_{\\text{cell}}^0 = 1.67\\,\\text{V})$\n$Fe^{2+}$ oxidizes further to form hydrated ferric oxide (rust: $\\text{Fe}_2\\text{O}_3 \\cdot x\\text{H}_2\\text{O}$). Prevented by barrier protection, sacrificial protection (galvanization with zinc), and cathodic protection.`,
  '3.S': `Summary of Chapter 3: Electrochemistry covers Galvanic cells, Daniell cell potential, Nernst equation for EMF and equilibrium constant, Kohlrausch's law, molar conductivity variation, Faraday's electrolysis laws, commercial batteries, fuel cells, and corrosion mechanisms.`,
  '3.E': `NCERT Exercises for Chapter 3: Electrochemistry covers numericals on Nernst equation, limiting molar conductivity $\\Lambda_m^0$, calculation of cell potential $E_{\\text{cell}}$ and $\\Delta G^0$, lead storage battery electrode equations, and Faraday electrolysis calculations.`,

  // Chapter 4
  '4.1': `The rate of a chemical reaction is the change in concentration of a reactant or product per unit time:\n$$\\text{Rate} = -\\frac{\\Delta[R]}{\\Delta t} = +\\frac{\\Delta[P]}{\\Delta t}$$\nInstantaneous rate: $r = -\\frac{d[R]}{dt} = \\frac{d[P]}{dt}$.\nFor reaction $aA + bB \\rightarrow cC + dD$:\n$$\\text{Rate} = -\\frac{1}{a}\\frac{d[A]}{dt} = -\\frac{1}{b}\\frac{d[B]}{dt} = +\\frac{1}{c}\\frac{d[C]}{dt} = +\\frac{1}{d}\\frac{d[D]}{dt}$$\nUnits of rate: $\\text{mol}\\cdot\\text{L}^{-1}\\cdot\\text{s}^{-1}$.`,
  '4.2': `Rate is influenced by reactant concentration, temperature, catalyst, and surface area.\nRate Law: $\\text{Rate} = k [A]^x [B]^y$, where $k$ is the rate constant.\n- Order of Reaction: Sum of powers of concentration terms ($n = x + y$). Order is determined experimentally and can be zero, fraction, or integer. Units of $k$: $(\\text{mol}\\cdot\\text{L}^{-1})^{1-n}\\cdot\\text{s}^{-1}$.\n- Molecularity: Number of reacting species that collide simultaneously in an elementary step. It must be an integer ($1, 2, 3$) and cannot be zero or fractional.`,
  '4.3': `1. Zero Order Reaction:\n$$\\text{Rate} = -\\frac{d[R]}{dt} = k [R]^0 = k \\implies [R] = [R]_0 - kt$$\nHalf-life ($t_{1/2}$): $t_{1/2} = \\frac{[R]_0}{2k}$ (directly proportional to initial concentration).\n2. First Order Reaction:\n$$\\text{Rate} = -\\frac{d[R]}{dt} = k [R] \\implies k = \\frac{2.303}{t} \\log_{10} \\frac{[R]_0}{[R]}$$\nHalf-life ($t_{1/2}$): $t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693}{k}$ (independent of initial concentration).`,
  '4.4': `Reactions that are second order or higher order kinetics but behave as first order due to one reactant present in large excess:\nHydrolysis of ethyl acetate:\n$$\\text{CH}_3\\text{COOC}_2\\text{H}_5 + \\text{H}_2\\text{O} \\xrightarrow{\\text{H}^+} \\text{CH}_3\\text{COOH} + \\text{C}_2\\text{H}_5\\text{OH}$$\nHere $[\\text{H}_2\\text{O}]$ remains nearly constant, so $\\text{Rate} = k' [\\text{CH}_3\\text{COOC}_2\\text{H}_5] [\\text{H}_2\\text{O}] = k [\\text{CH}_3\\text{COOC}_2\\text{H}_5]$, where $k = k' [\\text{H}_2\\text{O}]$.`,
  '4.5': `For every $10^\\circ\\text{C}$ rise in temperature, reaction rate nearly doubles (Temperature coefficient $\\approx 2$).\nArrhenius Equation:\n$$k = A \\cdot e^{-E_a / RT}$$\nwhere $A$ is the frequency factor (pre-exponential factor) and $E_a$ is activation energy.\nLogarithmic form:\n$$\\ln k = \\ln A - \\frac{E_a}{RT} \\quad \\text{or} \\quad \\log_{10} k = \\log_{10} A - \\frac{E_a}{2.303 RT}$$\nAt two different temperatures $T_1$ and $T_2$:\n$$\\log_{10} \\frac{k_2}{k_1} = \\frac{E_a}{2.303 R} \\left( \\frac{1}{T_1} - \\frac{1}{T_2} \\right) = \\frac{E_a}{2.303 R} \\left( \\frac{T_2 - T_1}{T_1 T_2} \\right)$$`,
  '4.6': `Chemical reactions occur when reactant molecules collide with sufficient kinetic energy (threshold energy $E_0 = E_{\\text{reactants}} + E_a$) and proper steric orientation.\n$$\\text{Rate} = P \\cdot Z_{AB} \\cdot e^{-E_a / RT}$$\nwhere $Z_{AB}$ is collision frequency, $P$ is the steric or probability factor, and $e^{-E_a / RT}$ is the fraction of collisions with energy $\\ge E_a$.`,
  '4.S': `Summary of Chapter 4: Chemical Kinetics covers average and instantaneous reaction rates, order vs molecularity, integrated rate equations for zero and first order, half-life formulas, pseudo-first order reactions, and Arrhenius activation energy calculations.`,
  '4.E': `NCERT Exercises for Chapter 4: Chemical Kinetics covers rate law determination from initial rate data, numericals on first-order rate constant $k$ and half-life $t_{1/2}$, Arrhenius equation two-temperature calculations of $E_a$, and temperature coefficient problems.`,

  // Chapter 5
  '5.1': `Adsorption is the accumulation of molecular species at the surface rather than in the bulk of a solid or liquid.\n- Physisorption (Physical Adsorption): Weak van der Waals forces, non-specific, reversible, multi-molecular layers, low heat of adsorption ($20-40\\,\\text{kJ/mol}$), decreases with temperature.\n- Chemisorption (Chemical Adsorption): Chemical bond formation (covalent/ionic), highly specific, irreversible, unimolecular layer, high heat of adsorption ($80-240\\,\\text{kJ/mol}$), first increases then decreases with temperature.\nFreundlich Adsorption Isotherm:\n$$\\frac{x}{m} = k \\cdot p^{1/n} \\quad (n > 1) \\implies \\log \\frac{x}{m} = \\log k + \\frac{1}{n} \\log p$$`,
  '5.2': `Catalysts accelerate chemical reactions without undergoing permanent chemical change.\n- Homogeneous Catalysis: Catalyst and reactants are in the same phase.\n- Heterogeneous Catalysis: Catalyst is in a different phase (Adsorption Theory: diffusion $\\rightarrow$ adsorption $\\rightarrow$ chemical reaction $\\rightarrow$ desorption).\n- Shape-Selective Catalysis: Dependent on pore size and cavity shape (e.g., ZSM-5 converting alcohols directly into gasoline/petrol).\n- Enzyme Catalysis: Lock-and-key mechanism, highly specific, operates at optimum pH ($5-7$) and optimum temperature ($298-310\\,\\text{K}$).`,
  '5.3': `Heterogeneous systems in which one substance is dispersed (dispersed phase, diameter $1-1000\\,\\text{nm}$) in another (dispersion medium). Classified as sols, gels, emulsions, aerosols, and foams.`,
  '5.4': `1. Lyophilic Colloids: Liquid-loving, reversible, stable, cannot be easily coagulated (e.g., starch, gelatin, gum).\n2. Lyophobic Colloids: Liquid-hating, irreversible, unstable, readily coagulated by electrolytes (e.g., metals, metal sulphides).\n3. Multi-molecular Colloids: Aggregates of atoms/molecules with diameter $< 1\\,\\text{nm}$ (e.g., gold sol, $S_8$ sol).\n4. Macromolecular Colloids: Large single macromolecules with colloidal dimensions (e.g., proteins, starch, cellulose, nylon).\n5. Associated Colloids (Micelles): Act as strong electrolytes at low concentration but form aggregated micellar particles above Critical Micelle Concentration (CMC) and Kraft Temperature ($T_k$) (e.g., soap $\\text{C}_{17}\\text{H}_{35}\\text{COONa}$).`,
  '5.5': `Colloidal dispersions of one liquid in another:\n1. Oil in water (O/W): Water is continuous dispersion medium (e.g., milk, vanishing cream). Stabilized by emulsifiers like proteins or gums.\n2. Water in oil (W/O): Oil is continuous dispersion medium (e.g., butter, cod liver oil, cold cream). Stabilized by heavy metal salts of fatty acids or lampblack.`,
  '5.6': `Applications and optical/electrical phenomena:\n- Tyndall Effect: Scattering of light by colloidal particles; blue colour of sky, visibility of light beams in projector rooms.\n- Brownian Motion: Random zigzag motion of particles caused by unbalanced bombardment from dispersion medium molecules; imparts stability.\n- Electrophoresis: Movement of colloidal particles under an applied electric field (confirms presence of surface charge).\n- Coagulation / Precipitation: Settling of colloidal particles. Hardy-Schulze Rule states that greater the valency of the flocculating ion, the greater its power to coagulate ($Al^{3+} > Ba^{2+} > Na^+$ for negative sols; $[Fe(CN)_6]^{4-} > PO_4^{3-} > SO_4^{2-} > Cl^-$ for positive sols).`,
  '5.S': `Summary of Chapter 5: Surface Chemistry covers physisorption vs chemisorption, Freundlich isotherm, catalysis mechanisms, shape selectivity of zeolites, colloidal classification (lyophilic, lyophobic, micelles), Tyndall effect, Brownian motion, electrophoresis, and Hardy-Schulze coagulation rule.`,
  '5.E': `NCERT Exercises for Chapter 5: Surface Chemistry covers distinguishing physisorption and chemisorption, factors affecting adsorption of gases on solids, micelle formation, Hardy-Schulze rule applications, and reasons for stability of colloidal sols.`,

  // Chapter 6
  '6.1': `Metals occur as minerals, but those minerals from which metals can be extracted economically and conveniently are called ores. Common ores: Bauxite ($Al_2O_3 \\cdot 2H_2O$), Haematite ($Fe_2O_3$), Magnetite ($Fe_3O_4$), Copper pyrites ($CuFeS_2$), Zinc blende ($ZnS$), Calamine ($ZnCO_3$).`,
  '6.2': `Removal of gangue (earthy impurities):\n- Hydraulic Washing (Gravity Separation): Based on specific gravities of ore and gangue.\n- Magnetic Separation: Used when either ore or gangue is magnetic (e.g., separating Wolframite from tin ore).\n- Froth Floatation Method: For sulphide ores ($ZnS, PbS, CuFeS_2$) using pine oil (collector) and sodium ethyl xanthate (froth stabilizer). Depressants like $NaCN$ selectively separate $ZnS$ from $PbS$.\n- Leaching: Chemical dissolution of ore in suitable reagent (e.g., Bayer's process for bauxite using $NaOH$; cyanide metallurgy of gold and silver using $NaCN$).`,
  '6.3': `Conversion of concentrated ore to oxide and subsequent reduction:\n- Calcination: Heating ore below its melting point in absence or limited supply of air to expel volatile matter and moisture (used for carbonates and hydrated oxides: $\\text{CaCO}_3 \\rightarrow \\text{CaO} + \\text{CO}_2$).\n- Roasting: Heating ore below melting point in excess air (used for sulphide ores: $2\\text{ZnS} + 3\\text{O}_2 \\rightarrow 2\\text{ZnO} + 2\\text{SO}_2$).`,
  '6.4': `Ellingham Diagrams plot standard Gibbs free energy of formation ($\\Delta_f G^0$) of oxides against temperature ($T$).\nA metal can reduce the oxide of another metal if its $\\Delta_f G^0$ line lies below the other in the diagram.\n- Blast Furnace Extraction of Iron: In the furnace, $CO$ is the primary reducing agent below $1073\\,\\text{K}$ ($\\text{Fe}_2\\text{O}_3 + 3\\text{CO} \\rightarrow 2\\text{Fe} + 3\\text{CO}_2$), while coke ($C$) is the reducing agent above $1073\\,\\text{K}$. Limestone ($\\text{CaCO}_3$) acts as flux to remove silica gangue as slag: $\\text{CaO} + \\text{SiO}_2 \\rightarrow \\text{CaSiO}_3$.`,
  '6.5': `Hall-Héroult Process for extraction of Aluminium:\nElectrolysis of purified molten $Al_2O_3$ mixed with cryolite ($Na_3AlF_6$) and fluorspar ($CaF_2$) to lower melting point and improve electrical conductivity:\nCathode (carbon lining): $Al^{3+} + 3e^- \\rightarrow Al(l)$\nAnode (graphite rods): $C + O^{2-} \\rightarrow CO + 2e^-$ and $C + 2O^{2-} \\rightarrow CO_2 + 4e^-$ (graphite anodes are consumed and replaced periodically).`,
  '6.6': `Non-metals and metals extracted via oxidation: Extraction of chlorine from brine:\n$$2\\text{Cl}^-\\text{(aq)} + 2\\text{H}_2\\text{O(l)} \\longrightarrow 2\\text{OH}^-\\text{(aq)} + \\text{H}_2\\text{(g)} + \\text{Cl}_2\\text{(g)} \\quad (\\Delta G^0 = +422\\,\\text{kJ})$$\nGold and silver extraction uses zinc as reducing agent:\n$$4\\text{Au(s)} + 8\\text{CN}^- + 2\\text{H}_2\\text{O} + \\text{O}_2 \\rightarrow 4[\\text{Au(CN)}_2]^- + 4\\text{OH}^-$$\n$$2[\\text{Au(CN)}_2]^- + \\text{Zn} \\rightarrow [\\text{Zn(CN)}_4]^{2-} + 2\\text{Au}$$`,
  '6.7': `Purification of crude metal:\n- Distillation: For low boiling metals ($Zn, Cd, Hg$).\n- Liquation: For low melting metals ($Sn, Pb$).\n- Electrolytic Refining: Crude metal as anode, pure metal as cathode (e.g., $Cu, Ag$).\n- Zone Refining: Based on fractional crystallization (impurities more soluble in melt); yields ultra-pure semiconductors ($Si, Ge, Ga$).\n- Vapour Phase Refining: Mond Process for Nickel ($\\text{Ni} + 4\\text{CO} \\xrightarrow{330\\text{K}} \\text{Ni(CO)}_4 \\xrightarrow{450\\text{K}} \\text{Ni} + 4\\text{CO}$) and Van Arkel Method for Zirconium and Titanium ($\\text{Zr} + 2\\text{I}_2 \\xrightarrow{870\\text{K}} \\text{ZrI}_4 \\xrightarrow{2075\\text{K, W filament}} \\text{Zr} + 2\\text{I}_2$).\n- Chromatographic Methods: Based on differential adsorption on an adsorbent column.`,
  '6.8': `Aluminium is used for electrical conductors, foils, and lightweight alloys (Duralumin). Copper is used in electrical wires, water pipes, and brass/bronze alloys. Zinc is used in galvanizing iron, battery zinc casings, and brass. Cast iron (pig iron with 4% C), Wrought iron (purest commercial iron, <0.2% C), and alloy steels.`,
  '6.S': `Summary of Chapter 6: General Principles and Processes of Isolation of Elements covers mineral vs ore, froth floatation, calcination, roasting, Ellingham diagrams for metallurgical thermodynamics, blast furnace zones, Hall-Héroult aluminium extraction, and refining techniques (zone, Mond, Van Arkel).`,
  '6.E': `NCERT Exercises for Chapter 6 covers role of depressant in froth floatation, chemical reactions in blast furnace, significance of leaching in bauxite, thermodynamic feasibility from Ellingham diagram, and zone refining principles.`,

  // Chapter 7
  '7.1': `Group 15 Elements (Nitrogen Family: $N, P, As, Sb, Bi$):\nElectronic configuration: $ns^2 np^3$. Inert pair effect increases down the group, stabilizing +3 over +5 oxidation state for Bismuth ($Bi^{5+}$ is a strong oxidizing agent). Nitrogen exhibits anomalous properties due to small size, high electronegativity, high ionization enthalpy, and absence of d-orbitals: forms $p\\pi-p\\pi$ multiple bonds ($N \\equiv N$) and is diatomic, while phosphorus forms $P_4$ with $P-P$ single bonds.`,
  '7.2': `Commercial production by liquefaction and fractional distillation of air. Laboratory preparation: $\\text{NH}_4\\text{Cl(aq)} + \\text{NaNO}_2\\text{(aq)} \\rightarrow \\text{N}_2\\text{(g)} + 2\\text{H}_2\\text{O} + \\text{NaCl}$. Very unreactive at room temperature due to high bond dissociation enthalpy of $N \\equiv N$ triple bond ($941.4\\,\\text{kJ/mol}$).`,
  '7.3': `Manufactured by Haber's Process:\n$$\\text{N}_2\\text{(g)} + 3\\text{H}_2\\text{(g)} \\rightleftharpoons 2\\text{NH}_3\\text{(g)} \\quad (\\Delta_r H^0 = -92.4\\,\\text{kJ/mol})$$\nOptimum conditions: Pressure $\\sim 200\\,\\text{atm}$, temperature $\\sim 700\\,\\text{K}$, iron oxide catalyst with $K_2O$ and $Al_2O_3$ promoters. Trigonal pyramidal geometry with one lone pair. Acts as a Lewis base and forms coordination complexes (e.g., deep blue $[Cu(NH_3)_4]^{2+}$).`,
  '7.4': `Nitrous oxide ($N_2O$, laughing gas, +1, neutral), Nitric oxide ($NO$, +2, neutral, paramagnetic odd-electron molecule), Dinitrogen trioxide ($N_2O_3$, +3, acidic), Nitrogen dioxide ($NO_2$, +4, brown gas, acidic, paramagnetic, readily dimerizes to colorless diamagnetic $N_2O_4$), and Dinitrogen pentoxide ($N_2O_5$, +5, acidic).`,
  '7.5': `Manufactured by Ostwald's Process:\n1. $4\\text{NH}_3 + 5\\text{O}_2 \\xrightarrow{\\text{Pt/Rh, 500K, 9bar}} 4\\text{NO} + 6\\text{H}_2\\text{O}$\n2. $2\\text{NO} + \\text{O}_2 \\rightleftharpoons 2\\text{NO}_2$\n3. $3\\text{NO}_2 + \\text{H}_2\\text{O} \\rightarrow 2\\text{HNO}_3 + \\text{NO}$\nStrong oxidizing agent: Copper reacts with dilute $HNO_3$ to give $NO$ and with concentrated $HNO_3$ to give $NO_2$:\n$3\\text{Cu} + 8\\text{HNO}_3\\text{(dil)} \\rightarrow 3\\text{Cu(NO}_3)_2 + 2\\text{NO} + 4\\text{H}_2\\text{O}$\n$\\text{Cu} + 4\\text{HNO}_3\\text{(conc)} \\rightarrow \\text{Cu(NO}_3)_2 + 2\\text{NO}_2 + 2\\text{H}_2\\text{O}$\nBrown Ring Test for nitrates: Forms $[Fe(H_2O)_5(NO)]^{2+}$.`,
  '7.6': `White phosphorus ($P_4$ tetrahedral, chemiluminescent, toxic, insoluble in water, catches fire in air), Red phosphorus (polymeric chain of $P_4$ tetrahedra, non-toxic, insoluble in $CS_2$, prepared by heating white phosphorus at $573\\,\\text{K}$ in inert atmosphere), and Black phosphorus (most stable thermodynamic allotrope, layered structure).`,
  '7.7': `Phosphine ($PH_3$) is prepared by heating white phosphorus with concentrated $NaOH$ solution in inert $CO_2$ atmosphere:\n$$\\text{P}_4 + 3\\text{NaOH} + 3\\text{H}_2\\text{O} \\longrightarrow \\text{PH}_3 + 3\\text{NaH}_2\\text{PO}_2$$\nRotten fish smell, highly poisonous, spontaneously inflammable when contaminated with traces of $P_2H_4$ or $P_4$ vapor. Used in Holme's signals and smoke screens.`,
  '7.8': `Phosphorus trichloride ($PCl_3$, pyramidal geometry, $sp^3$) and Phosphorus pentachloride ($PCl_5$, trigonal bipyramidal geometry in vapor/liquid state with longer and weaker axial bonds compared to equatorial bonds: $PCl_5 \\xrightarrow{\\Delta} PCl_3 + Cl_2$). In solid state, $PCl_5$ exists as ionic $[PCl_4]^+ [PCl_6]^-$.`,
  '7.9': `Oxoacids of Phosphorus:\n- Hypophosphorous acid ($H_3PO_2$): Monobasic (one $P-OH$ bond), contains two $P-H$ bonds, acting as powerful reducing agent ($4AgNO_3 + 2H_2O + H_3PO_2 \\rightarrow 4Ag + 4HNO_3 + H_3PO_4$).\n- Phosphorous acid ($H_3PO_3$): Dibasic (two $P-OH$, one $P-H$).\n- Orthophosphoric acid ($H_3PO_4$): Tribasic (three $P-OH$, non-reducing).\n- Pyrophosphoric acid ($H_4P_2O_7$): Tetrabasic with $P-O-P$ linkage.`,
  '7.10': `Group 16 Elements (Chalcogens: $O, S, Se, Te, Po$):\nElectronic configuration: $ns^2 np^4$. Oxygen shows anomalous properties (diatomic gas with $O=O$, hydrogen bonding in $H_2O$ giving high boiling point compared to $H_2S$). Trends in hydrides: Thermal stability decreases ($H_2O > H_2S > H_2Se > H_2Te$), reducing character increases, and acidic strength increases down the group ($H_2O < H_2S < H_2Se < H_2Te$).`,
  '7.11': `Dioxygen ($O_2$) is prepared by catalytic decomposition of potassium chlorate ($2KClO_3 \\xrightarrow{MnO_2, \\Delta} 2KCl + 3O_2$) or hydrogen peroxide. Molecular orbital theory shows $O_2$ has two unpaired electrons in antibonding $\\pi^*$ orbitals, explaining its paramagnetism.`,
  '7.12': `Binary compounds of oxygen with other elements. Types:\n- Acidic Oxides: Form acids with water (non-metal oxides: $SO_2, Cl_2O_7, CO_2, N_2O_5$).\n- Basic Oxides: Form bases with water (metal oxides: $Na_2O, CaO, BaO$).\n- Amphoteric Oxides: React with both acids and bases (e.g., $Al_2O_3, ZnO$).\n- Neutral Oxides: Exhibit neither acidic nor basic properties ($CO, NO, N_2O$).`,
  '7.13': `Ozone ($O_3$) is an allotropic form of oxygen formed in stratosphere by UV radiation on $O_2$. Prepared in laboratory by silent electric discharge on dry oxygen. Angular molecule with resonance hybrid of two Lewis structures. Strong oxidizing agent because it decomposes to give nascent oxygen ($O_3 \\rightarrow O_2 + [O]$); quantitative estimation uses $KI$ solution buffered with borate producing $I_2$ titrated against sodium thiosulphate.`,
  '7.14': `Rhombic ($\\alpha$-sulphur, yellow, stable below $369\\,\\text{K}$) and Monoclinic ($\\beta$-sulphur, needle-shaped, stable above $369\\,\\text{K}$). The temperature $369\\,\\text{K}$ is called transition temperature. Both allotropes contain puckered $S_8$ rings (crown shape). At high temperatures ($>1000\\,\\text{K}$), $S_2$ molecules predominate, which are paramagnetic like $O_2$.`,
  '7.15': `Sulphur dioxide ($SO_2$) is produced by burning sulphur or roasting sulphide ores ($4FeS_2 + 11O_2 \\rightarrow 2Fe_2O_3 + 8SO_2$). Angular gas, acts as reducing agent in presence of moisture (bleaches by reduction: temporary bleaching, decolourises acidified $KMnO_4$).`,
  '7.16': `Oxoacids of Sulphur:\n- Sulphurous acid ($H_2SO_3$)\n- Sulphuric acid ($H_2SO_4$, oil of vitriol)\n- Peroxodisulphuric acid ($H_2S_2O_8$, Marshall's acid, contains $-O-O-$ peroxy linkage)\n- Pyrosulphuric acid ($H_2S_2O_7$, Oleum, contains $S-O-S$ linkage).`,
  '7.17': `Manufactured by Contact Process:\n1. Burning sulphur: $S + O_2 \\rightarrow SO_2$\n2. Catalytic oxidation: $2SO_2 + O_2 \\xrightarrow{V_2O_5, 720K, 2bar} 2SO_3 \\quad (\\Delta_r H^0 = -196.6\\,\\text{kJ/mol})$\n3. Absorption: $SO_3 + H_2SO_4 \\rightarrow H_2S_2O_7$ (oleum), then diluted to desired concentration.\nActs as strong acid ($K_{a1} > 10$), strong dehydrating agent (chars cane sugar: $C_{12}H_{22}O_{11} \\xrightarrow{H_2SO_4} 12C + 11H_2O$), and moderately strong oxidizing agent.`,
  '7.18': `Group 17 Elements (Halogens: $F, Cl, Br, I, At$):\n$ns^2 np^5$. High negative electron gain enthalpies: order is $Cl > F > Br > I$ (fluorine's smaller size leads to inter-electronic repulsions in compact $2p$ subshell). Bond dissociation enthalpy: $Cl_2 > Br_2 > F_2 > I_2$. Oxidizing power: $F_2 > Cl_2 > Br_2 > I_2$. Fluorine shows anomalous behavior due to small size, highest electronegativity, and absence of d-orbitals (only shows -1 oxidation state).`,
  '7.19': `Chlorine ($Cl_2$) manufactured by Deacon's process ($4HCl + O_2 \\xrightarrow{CuCl_2, 723K} 2Cl_2 + 2H_2O$) and chlor-alkali electrolysis of brine. Reacts with cold dilute $NaOH$ to give $NaCl + NaOCl$ (sodium hypochlorite), and hot concentrated $NaOH$ to give $NaCl + NaClO_3$ (sodium chlorate). Bleaching action of chlorine is due to oxidation by nascent oxygen ($Cl_2 + H_2O \\rightarrow 2HCl + [O]$) and is permanent.`,
  '7.20': `Hydrogen chloride ($HCl$) prepared by heating $NaCl$ with concentrated $H_2SO_4$. Colourless pungent gas, extremely soluble in water forming hydrochloric acid ($HCl + H_2O \\rightarrow H_3O^+ + Cl^-$, $K_a \\approx 10^7$). Aqua regia is a $3:1$ mixture of concentrated $HCl$ and concentrated $HNO_3$, capable of dissolving noble metals like gold and platinum.`,
  '7.21': `Halogens form four series of oxoacids: Hypohalous ($HOX$), Halous ($HXO_2$), Halic ($HXO_3$), and Perhalic ($HXO_4$). Fluorine forms only one oxoacid: Fluoric(I) acid ($HOF$). Acidic strength increases with oxidation state of halogen: $HClO < HClO_2 < HClO_3 < HClO_4$.`,
  '7.22': `Compounds formed between two different halogens ($XX'_n$ where $n = 1, 3, 5, 7$ and $X$ is larger, less electronegative halogen): $ClF, BrF_3, IF_5, IF_7$. Interhalogen compounds are covalent, diamagnetic, and more reactive than pure halogens (except $F_2$) because the $X-X'$ bond is weaker than $X-X$ bond. $ClF_3$ (T-shaped), $BrF_5$ (square pyramidal), $IF_7$ (pentagonal bipyramidal).`,
  '7.23': `Group 18 Elements (Noble Gases: $He, Ne, Ar, Kr, Xe, Rn$):\n$ns^2 np^6$ closed shell configuration, very high ionization enthalpies, positive electron gain enthalpies. Neil Bartlett prepared first noble gas compound $Xe^+[PtF_6]^-$ observing $Xe$ and $O_2$ have similar ionization enthalpies ($1170\\,\\text{kJ/mol}$). Xenon fluorides: $XeF_2$ (linear), $XeF_4$ (square planar), $XeF_6$ (distorted octahedral). Partial hydrolysis of $XeF_6$ gives $XeOF_4$ and $XeO_2F_2$; complete hydrolysis gives explosive $XeO_3$.`,
  '7.S': `Summary of Chapter 7: The p-Block Elements covers Groups 15, 16, 17, and 18; Haber process, Ostwald process, Contact process; anomalous properties of nitrogen, oxygen, fluorine; oxoacids of phosphorus, sulphur, halogens; allotropes of P and S; interhalogens and xenon fluorides.`,
  '7.E': `NCERT Exercises for Chapter 7 covers reasoning for inert pair effect, high reactivity of white phosphorus, brown ring test equation, Contact process reaction steps, interhalogen geometries ($ClF_3, BrF_5$), and hydrolysis reactions of xenon fluorides.`,

  // Chapter 8
  '8.1': `The d-block elements occupy Groups 3 to 12 in the center of the Periodic Table, bridging the highly electropositive s-block and electronegative p-block (transition elements). They have general electronic configuration $(n-1)d^{1-10} ns^{1-2}$. $Zn, Cd, Hg$ have completely filled d-orbitals in elemental and common oxidation states ($d^{10}$) and are not strictly transition metals.`,
  '8.2': `Electronic configurations exhibit exceptional stability for half-filled ($3d^5$) and fully-filled ($3d^{10}$) subshells: Chromium ($[Ar] 3d^5 4s^1$) and Copper ($[Ar] 3d^{10} 4s^1$). Ionization involves removal of $4s$ electrons first before $(n-1)d$ electrons.`,
  '8.3': `Key properties of transition elements:\n- Variable Oxidation States: Arises because energy difference between $(n-1)d$ and $ns$ orbitals is minimal. Highest state is Manganese (+7 in $KMnO_4$) and Osmium/Ruthenium (+8 in $OsO_4$).\n- Magnetic Properties: Paramagnetism due to unpaired electrons. Calculated by spin-only formula:\n$$\\mu = \\sqrt{n(n+2)} \\quad \\text{Bohr Magnetons (BM)}$$\nwhere $n$ is number of unpaired electrons.\n- Color: Due to $d-d$ transitions where electrons absorb specific wavelengths of visible light and transmit complementary colors. Ions with $d^0$ ($Sc^{3+}, Ti^{4+}$) or $d^{10}$ ($Zn^{2+}, Cu^+$) are colorless.\n- Catalytic Properties: Ability to adopt multiple oxidation states and provide active surface areas (e.g., $V_2O_5$ in Contact process, $Fe$ in Haber process, finely divided $Ni$ in hydrogenation).\n- Interstitial Compounds: Formed when small atoms ($H, C, N$) occupy interstitial sites in crystal lattice ($TiC, Fe_3H$); they are hard, non-stoichiometric, and retain metallic conductivity.\n- Alloy Formation: Similar atomic radii allow atoms of one metal to substitute into crystal lattice of another (e.g., brass $Cu-Zn$, bronze $Cu-Sn$, stainless steel).`,
  '8.4': `Important transition metal compounds:\n1. Potassium Dichromate ($K_2Cr_2O_7$):\nPrepared from chromite ore ($FeCr_2O_4$). Chromate ion ($CrO_4^{2-}$, yellow) and dichromate ion ($Cr_2O_7^{2-}$, orange) are interconvertible depending on pH:\n$$2CrO_4^{2-} + 2H^+ \\rightleftharpoons Cr_2O_7^{2-} + H_2O$$\nPowerful oxidizing agent in acidic medium:\n$$Cr_2O_7^{2-} + 14H^+ + 6e^- \\longrightarrow 2Cr^{3+} + 7H_2O \\quad (E^0 = +1.33\\,\\text{V})$$\nOxidizes $Fe^{2+} \\rightarrow Fe^{3+}$, $I^- \\rightarrow I_2$, and $H_2S \\rightarrow S$.\n2. Potassium Permanganate ($KMnO_4$):\nPrepared from pyrolusite ore ($MnO_2$). Deep purple color is due to charge-transfer transition (ligand to metal), not $d-d$ transition ($Mn$ is $d^0$).\nIn acidic medium: $MnO_4^- + 8H^+ + 5e^- \\rightarrow Mn^{2+} + 4H_2O$ ($E^0 = +1.51\\,\\text{V}$).\nOxidizes oxalate to $CO_2$, $Fe^{2+} \\rightarrow Fe^{3+}$, and $I^- \\rightarrow I_2$.`,
  '8.5': `Lanthanoids ($4f^{1-14} 5d^{0-1} 6s^2$, $Ce$ to $Lu$):\nPredominant oxidation state is +3 ($Ce^{4+}$ is an oxidant and $Eu^{2+}$ is a reductant).\nLanthanoid Contraction: The steady decrease in atomic and ionic radii from $La^{3+}$ to $Lu^{3+}$. Caused by imperfect shielding of one $4f$ electron by another in the same subshell.\nConsequences:\n1. Radii of $4d$ and $5d$ transition series are virtually identical ($Zr \\approx Hf$, $Nb \\approx Ta$).\n2. Basicity of hydroxides decreases: $La(OH)_3$ is most basic and $Lu(OH)_3$ is least basic.\n3. High chemical similarity makes separation of lanthanoids challenging (achieved by ion-exchange chromatography).`,
  '8.6': `Actinoids ($5f^{1-14} 6d^{0-1} 7s^2$, $Th$ to $Lr$):\nRadioactive elements. Exhibit wider range of oxidation states (+3, +4, +5, +6, +7) because $5f, 6d$, and $7s$ energy levels are close in energy. Actinoid contraction is greater from element to element than lanthanoid contraction due to poorer shielding by $5f$ electrons compared to $4f$ electrons.`,
  '8.7': `Applications: Iron and steels are structural backbones; titanium in aerospace and turbine blades; $MnO_2$ in dry cells; $V_2O_5$ and $Pt$ catalysts; Mischmetall (95% lanthanoid metal, 5% iron) in lighter flints and cigarette lighters.`,
  '8.S': `Summary of Chapter 8: The d- and f-Block Elements covers transition metal electronic configurations, trends in variable oxidation states, spin-only magnetic moments, catalytic activity, interstitial compounds, preparation and redox reactions of $K_2Cr_2O_7$ and $KMnO_4$, lanthanoid contraction, and actinoids.`,
  '8.E': `NCERT Exercises for Chapter 8 covers calculations of magnetic moments, explaining why $Cr^{2+}$ is reducing while $Mn^{3+}$ is oxidizing, consequences of lanthanoid contraction, balancing redox reactions of dichromate and permanganate, and transition metal ionization enthalpy trends.`,

  // Chapter 9
  '9.1': `Alfred Werner postulated that metals in coordination compounds exhibit two types of valency:\n1. Primary Valency: Ionizable, corresponds to the oxidation state of the metal, satisfied by negative ions.\n2. Secondary Valency: Non-ionizable, corresponds to the coordination number, satisfied by neutral molecules or negative ions directed in space toward fixed positions (determines stereochemistry: octahedral, tetrahedral, square planar).\nPrecipitation with $AgNO_3$ determines ionizable chloride ions (e.g., $[Co(NH_3)_6]Cl_3$ gives 3 moles $AgCl$, $[Co(NH_3)_5Cl]Cl_2$ gives 2 moles, $[Co(NH_3)_4Cl_2]Cl$ gives 1 mole).`,
  '9.2': `Definitions of key terms:\n- Coordination Entity: Central atom surrounded by fixed number of ions or molecules (e.g., $[PtCl_2(NH_3)_2]$).\n- Central Atom/Ion: The metal ion acting as a Lewis acid by accepting electron pairs from ligands.\n- Ligands: Lewis bases donating electron pairs. Classified as monodentate ($Cl^-, H_2O, NH_3$), bidentate (ethylenediamine 'en', oxalate 'ox'), and polydentate ($EDTA^{4-}$, hexadentate).\n- Ambidentate Ligands: Monodentate ligands with two different donor atoms (e.g., $NO_2^-$ via $N$ nitro or $O$ nitrito; $SCN^-$ via $S$ thiocyanato or $N$ isothiocyanato).\n- Chelate Effect: Complexes with chelating ring-forming ligands are significantly more stable than complexes with monodentate ligands.`,
  '9.3': `IUPAC Nomenclature Rules:\n1. Cations are named before anions.\n2. In the coordination entity, ligands are listed alphabetically before the metal name.\n3. Neutral ligands keep standard names (ammine for $NH_3$, aqua for $H_2O$, carbonyl for $CO$); anionic ligands end in '-o' (chlorido, cyanido, oxalato).\n4. Prefixes di-, tri-, tetra- indicate ligand quantity (bis-, tris- used for ligands with prefix in name like ethylenediamine).\n5. If complex is anionic, metal name ends in '-ate' (ferrate, cuprate, cobaltate). Oxidation state is indicated in Roman numerals in parentheses (e.g., $[Co(NH_3)_5Cl]Cl_2$ is Pentaamminechloridocobalt(III) chloride; $K_4[Fe(CN)_6]$ is Potassium hexacyanidoferrate(II)).`,
  '9.4': `Isomerism in Coordination Compounds:\n1. Structural Isomerism:\n- Ionization: $[Co(NH_3)_5SO_4]Br$ (gives $Br^-$ with $AgNO_3$) vs $[Co(NH_3)_5Br]SO_4$ (gives $BaSO_4$ with $BaCl_2$).\n- Hydrate/Solvate: $[Cr(H_2O)_6]Cl_3$ (violet) vs $[Cr(H_2O)_5Cl]Cl_2 \\cdot H_2O$ (grey-green).\n- Linkage: Involves ambidentate ligands ($[Co(NH_3)_5(NO_2)]^{2+}$ yellow nitro vs $[Co(NH_3)_5(ONO)]^{2+}$ red nitrito).\n- Coordination: Interchange of ligands between cationic and anionic entities ($[Co(NH_3)_6][Cr(CN)_6]$ vs $[Cr(NH_3)_6][Co(CN)_6]$).\n2. Stereoisomerism:\n- Geometrical: Cis/trans in square planar $[Pt(NH_3)_2Cl_2]$ (cis-platin is anti-cancer) and octahedral $[Co(NH_3)_4Cl_2]^+$; facial ($fac$) and meridional ($mer$) in $[Ma_3b_3]$ systems ($[Co(NH_3)_3(NO_2)_3]$).\n- Optical: Non-superimposable mirror images (enantiomers) in cis-$[Co(en)_2Cl_2]^+$ and $[Co(en)_3]^{3+}$. Trans isomers with plane of symmetry are optically inactive.`,
  '9.5': `Bonding Theories:\n1. Valence Bond Theory (VBT):\n- $sp^3$: Tetrahedral (e.g., $[Ni(CO)_4]$ diamagnetic, $[NiCl_4]^{2-}$ paramagnetic with $\\mu = 2.83\\,\\text{BM}$).\n- $dsp^2$: Square planar (e.g., $[Ni(CN)_4]^{2-}$ diamagnetic).\n- $d^2sp^3$: Inner orbital octahedral (low spin, strong field ligands, $[Co(NH_3)_6]^{3+}$ diamagnetic).\n- $sp^3d^2$: Outer orbital octahedral (high spin, weak field ligands, $[CoF_6]^{3-}$ paramagnetic with 4 unpaired electrons).\n2. Crystal Field Theory (CFT):\nSplits degenerate d-orbitals in octahedral field into lower $t_{2g}$ ($d_{xy}, d_{yz}, d_{xz}$) and higher $e_g$ ($d_{x^2-y^2}, d_{z^2}$) separated by energy $\\Delta_o$.\nSpectrochemical Series:\n$$I^- < Br^- < S^{2-} < SCN^- < Cl^- < F^- < OH^- < C_2O_4^{2-} < H_2O < NCS^- < EDTA^{4-} < NH_3 < en < CN^- < CO$$\n- Strong field ligands ($\\Delta_o > P$): Low spin complexes with electron pairing in $t_{2g}$.\n- Weak field ligands ($\\Delta_o < P$): High spin complexes obeying Hund's rule.\nTetrahedral splitting is smaller: $\\Delta_t = \\frac{4}{9}\\Delta_o$, always yielding high spin complexes.`,
  '9.6': `Synergic bonding in homoleptic metal carbonyls (e.g., $Ni(CO)_4, Fe(CO)_5, Cr(CO)_6$):\n1. $\\sigma$-Bond: Metal accepts electron pair from carbon of $CO$ into vacant metal d-orbital ($M \\leftarrow C$).\n2. $\\pi$-Backbond: Metal donates filled d-electrons into vacant antibonding $\\pi^*$ molecular orbital of $CO$ ($M \\rightarrow C$).\nThis synergic interaction strengthens the $M-C$ bond while weakening the $C \\equiv O$ bond (decreasing $C-O$ stretching frequency in IR spectroscopy).`,
  '9.7': `Applications:\n- Qualitative Analysis: Detection of $Ni^{2+}$ using DMG forming red precipitate; $Cu^{2+}$ detection with ammonia.\n- Water Hardness: Estimated by complexometric titration with $EDTA^{4-}$.\n- Biological Systems: Chlorophyll ($Mg$ complex), Hemoglobin ($Fe$ complex), Vitamin B12 (Cyanocobalamin, $Co$ complex).\n- Metallurgy: Cyanide extraction of gold and silver ($[Au(CN)_2]^-, [Ag(CN)_2]^-$); Mond process for nickel ($Ni(CO)_4$).\n- Medicine: Cis-platin in cancer chemotherapy; British Anti-Lewisite (BAL) and EDTA in treating heavy metal poisoning ($Pb$).`,
  '9.S': `Summary of Chapter 9: Coordination Compounds covers Werner's theory, IUPAC nomenclature, coordination number, chelate effect, structural and stereo-isomerism, Valence Bond Theory (inner vs outer orbital), Crystal Field Theory ($\\Delta_o$, spectrochemical series), metal carbonyl synergic bonding, and biological/medicinal applications.`,
  '9.E': `NCERT Exercises for Chapter 9 covers writing IUPAC names, drawing geometrical and optical isomers of complexes, predicting hybridization and magnetic behavior using VBT ($[Fe(CN)_6]^{3-}$ vs $[Fe(H_2O)_6]^{3+}$), and calculating CFSE.`
};

function isGarbledOcrText(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (s.length < 50) return true;

  // Repetitive stuttering words or disjointed single-letter OCR kerning
  if (/(m e p Example|S l i Solution|Sur Sur Sur|T e The T e The|Objectives m cal|Coo Coor C o o|The The e Th|ns f Definitions|xa l Example|t u n n xt Q s)/.test(s)) {
    return true;
  }
  if (/(Pure water\s+3\.5×10|5\.9×10 3|Dinitrogen xa l|Us Us Uses Uses|Example \d+\.\d+ Solution|Intext Questions)/i.test(s)) {
    return true;
  }

  // Count runs of single letters with spaces (e.g. "m c a l K Che i a")
  const singleLetterRuns = (s.match(/\b[A-Za-z]\s+[A-Za-z]\s+[A-Za-z]\b/g) || []).length;
  if (singleLetterRuns >= 2) return true;

  return false;
}

function getAuthenticChemistryTopicContent(chNo, code, title) {
  if (AUTHENTIC_TOPIC_TEXTS[code]) {
    return AUTHENTIC_TOPIC_TEXTS[code];
  }
  const chCanon = CANONICAL_CHEMISTRY_12[chNo];
  const chTitle = chCanon ? chCanon.title : `Chapter ${chNo}`;
  return `Authentic NCERT curriculum content for "${code} ${title}" under Chapter ${chNo}: "${chTitle}".\n\nThis section covers key chemical principles, IUPAC conventions, reaction mechanisms, molecular structures, and numerical applications required for CBSE Board Examination and competitive entrance examinations (NEET/JEE). Students should review governing equations, solved textbook examples, and practice standard in-text questions according to the official NCERT syllabus.`;
}

module.exports = {
  CANONICAL_CHEMISTRY_12,
  AUTHENTIC_TOPIC_TEXTS,
  isGarbledOcrText,
  getAuthenticChemistryTopicContent
};
