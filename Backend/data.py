# DEMO DATASET - must be reviewed by a pharmacist/doctor before real use.
BRANDS = {
 "dolo 650":["paracetamol"],"dolo":["paracetamol"],"crocin":["paracetamol"],"calpol":["paracetamol"],
 "combiflam":["ibuprofen","paracetamol"],"brufen":["ibuprofen"],"voveran":["diclofenac"],
 "zerodol":["aceclofenac"],"ecosprin":["aspirin"],"clopitab":["clopidogrel"],
 "glycomet":["metformin"],"pan 40":["pantoprazole"],"pan":["pantoprazole"],
 "aten":["atenolol"],"amlong":["amlodipine"],"telma":["telmisartan"],
 "storvas":["atorvastatin"],"lipitor":["atorvastatin"],"ciplox":["ciprofloxacin"],
 "azithral":["azithromycin"],"warfarin":["warfarin"],"ginkgo":["ginkgo"],"ashwagandha":["ashwagandha"],
}
CLASSES = {"ibuprofen":"NSAID","diclofenac":"NSAID","aceclofenac":"NSAID","atorvastatin":"Statin"}
# (drug A, drug B, severity, mechanism, symptoms to watch)
INTERACTIONS = [
 ("warfarin","aspirin","major","Additive bleeding risk (antiplatelet + anticoagulant)","Blood in stool/urine, black stools, easy bruising"),
 ("warfarin","ibuprofen","major","NSAID raises bleeding/GI haemorrhage risk with warfarin","Black stools, vomiting blood, unusual bleeding"),
 ("warfarin","diclofenac","major","NSAID raises bleeding/GI haemorrhage risk with warfarin","Black stools, vomiting blood, unusual bleeding"),
 ("warfarin","aceclofenac","major","NSAID raises bleeding/GI haemorrhage risk with warfarin","Black stools, vomiting blood, unusual bleeding"),
 ("warfarin","ciprofloxacin","major","Raised INR (CYP inhibition / gut flora)","Bruising, nosebleeds, blood in urine"),
 ("warfarin","ginkgo","major","Herbal antiplatelet effect adds to bleeding risk","Unusual bleeding or bruising"),
 ("warfarin","azithromycin","moderate","May raise INR","Unusual bleeding; INR check advised"),
 ("warfarin","paracetamol","moderate","Regular high-dose paracetamol can raise INR","Bruising; INR check advised"),
 ("aspirin","clopidogrel","moderate","Dual antiplatelet therapy increases bleeding","Black stools, prolonged bleeding"),
 ("aspirin","ibuprofen","moderate","GI bleeding risk; ibuprofen can blunt aspirin's cardiac protection","Stomach pain, black stools"),
 ("aspirin","diclofenac","moderate","Additive GI bleeding risk","Stomach pain, black stools"),
 ("aspirin","ginkgo","moderate","Additive antiplatelet effect","Unusual bleeding"),
 ("telmisartan","ibuprofen","moderate","NSAID reduces BP control and can harm kidneys","Swelling, reduced urine, high BP"),
 ("telmisartan","diclofenac","moderate","NSAID reduces BP control and can harm kidneys","Swelling, reduced urine, high BP"),
 ("atenolol","ibuprofen","moderate","NSAID can blunt antihypertensive effect","Rising blood pressure"),
 ("metformin","ciprofloxacin","moderate","Fluoroquinolones can cause blood sugar swings","Shakiness, sweating, excess thirst"),
]
TEMPLATES = {
 "en":{"major":"Serious risk: taking these together can cause serious harm. Consult your doctor before continuing.",
       "moderate":"Caution: taking these together may change how they work. Ask your doctor or pharmacist.",
       "minor":"Low risk: usually safe, but watch for symptoms.",
       "duplicate":"Same medicine under two names: you may be taking a double dose. Ask your doctor which to stop."},
 "hi":{"major":"गंभीर खतरा: इन्हें साथ लेने से गंभीर नुकसान हो सकता है। जारी रखने से पहले डॉक्टर से सलाह लें।",
       "moderate":"सावधानी: इन दवाओं को साथ लेने से असर बदल सकता है। डॉक्टर या फार्मासिस्ट से पूछें।",
       "minor":"हल्का जोखिम: आमतौर पर सुरक्षित, फिर भी लक्षणों पर ध्यान दें।",
       "duplicate":"एक ही दवा दो नामों से: दोहरी खुराक का खतरा है। डॉक्टर से पूछें कौन सी बंद करनी है।"},
 "gu":{"major":"ગંભીર જોખમ: આ સાથે લેવાથી ગંભીર નુકસાન થઈ શકે છે. ચાલુ રાખતા પહેલાં ડૉક્ટરની સલાહ લો.",
       "moderate":"સાવચેતી: આ દવાઓ સાથે લેવાથી અસર બદલાઈ શકે છે. ડૉક્ટર અથવા ફાર્માસિસ્ટને પૂછો.",
       "minor":"હળવું જોખમ: સામાન્ય રીતે સલામત, છતાં લક્ષણો પર ધ્યાન રાખો.",
       "duplicate":"એક જ દવા બે નામે: બમણો ડોઝ થવાનું જોખમ છે. કઈ બંધ કરવી તે ડૉક્ટરને પૂછો."},
}
