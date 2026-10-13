// i18n/am.ts — Amharic (አማርኛ). DRAFT translation: needs review by a native speaker.
// Keys must match en.ts exactly (TypeScript checks it); keep {placeholders} unchanged.
import type { MessageKey } from "./en";

export const am: Record<MessageKey, string> = {

  // ── App & shared ───────────────────────────────────────────────────────────
  "app.name": "Agri-Stack 360",
  "app.home": "የAgri-Stack 360 መነሻ",
  "lang.label": "ቋንቋ",
  "lang.choose": "ቋንቋ ይምረጡ",
  "common.loading": "በመጫን ላይ…",
  "common.cancel": "ሰርዝ",
  "common.confirm": "አረጋግጥ",
  "common.save": "አስቀምጥ",
  "common.saveChanges": "ለውጦችን አስቀምጥ",
  "common.saving": "በማስቀመጥ ላይ…",
  "common.close": "ዝጋ",
  "common.edit": "አስተካክል",
  "common.delete": "ሰርዝ",
  "common.add": "ጨምር",
  "common.back": "ተመለስ",
  "common.next": "ቀጣይ",
  "common.search": "ፈልግ",
  "common.retry": "እንደገና ይሞክሩ",
  "common.refresh": "አድስ",
  "common.all": "ሁሉም",
  "common.none": "ምንም",
  "common.yes": "አዎ",
  "common.no": "አይ",
  "common.optional": "አማራጭ",
  "common.required": "አስፈላጊ",
  "common.home": "መነሻ",
  "common.you": "እርስዎ",
  "common.actions": "ተግባራት",
  "common.status": "ሁኔታ",
  "common.name": "ስም",
  "common.phone": "ስልክ",
  "common.region": "ክልል",
  "common.zone": "ዞን",
  "common.woreda": "ወረዳ",
  "common.date": "ቀን",
  "common.total": "ጠቅላላ",
  "common.active": "ንቁ",
  "common.inactive": "ንቁ ያልሆነ",
  "common.unknown": "ያልታወቀ",
  "common.notSet": "አልተሞላም",
  "common.showMore": "ተጨማሪ አሳይ",
  "common.showLess": "ጥቂት አሳይ",
  "common.download": "አውርድ",
  "common.exportCsv": "CSV አውርድ",
  "common.viewAll": "ሁሉንም ይመልከቱ",
  "common.demoData": "አመላካች መረጃ",  // draft – needs native review
  "common.toggleSidebar": "የጎን ዝርዝሩን ክፈት/ዝጋ",
  "common.mainNavigation": "ዋና ማውጫ",
  "common.breadcrumb": "የገጽ መንገድ",
  "common.toggleTheme": "ብሩህ / ጨለማ ገጽታ ቀይር",
  "state.somethingWrong": "የሆነ ችግር ተፈጥሯል",
  "state.somethingWrongDot": "የሆነ ችግር ተፈጥሯል።",
  "state.checkingAccount": "መለያዎን በማረጋገጥ ላይ…",
  "error.unreachable": "{service} ጋር መገናኘት አልተቻለም። እየሰራ መሆኑን ያረጋግጡና እንደገና ይሞክሩ።",
  "service.server": "ሰርቨሩ",
  "service.platform": "የAgri-Stack ሰርቨር",
  "service.market": "የገበያ መረጃ አገልግሎት",
  "service.forecast": "የትንበያ አገልግሎት",
  "service.sync": "የመረጃ ማመሳሰያ አገልግሎት",
  "notFound.title": "ገጹ አልተገኘም",
  "notFound.description": "ይህ ገጽ የለም",
  "notFound.error": "ስህተት",
  "notFound.message": "የሚፈልጉትን ገጽ ማግኘት አልቻልንም።",
  "notFound.back": "ወደ ዳሽቦርዱ ተመለስ",

  // ── Navigation ─────────────────────────────────────────────────────────────
  "nav.menu": "ማውጫ",
  "nav.account": "መለያ",
  "nav.userManagement": "የተጠቃሚዎች አስተዳደር",
  "nav.administration": "አስተዳደር",
  "nav.dashboard": "ዳሽቦርድ",
  "nav.market": "የገበያ መረጃ",
  "nav.cropHealth": "የሰብል ጤና",
  "nav.inputs": "የግብዓት አቅራቢዎች",
  "nav.financial": "ፋይናንስ",
  "nav.advisory": "የAI ምክር",
  "nav.profile": "የእኔ መገለጫ",
  "nav.users": "ተጠቃሚዎች",
  "nav.roles": "ሚናዎች",
  "nav.permissions": "ፈቃዶች",
  "nav.dataSync": "የመረጃ ማመሳሰል",
  "nav.knowledge": "የእውቀት ማዕከል",
  "header.profileFarms": "መገለጫዬ እና ማሳዎቼ",
  "header.signOut": "ውጣ",

  // ── Roles ──────────────────────────────────────────────────────────────────
  "role.farmer": "አርሶ አደር",
  "role.agent": "የልማት ጣቢያ ሰራተኛ",
  "role.trader": "ነጋዴ",
  "role.admin": "አስተዳዳሪ",

  // ── Layout ─────────────────────────────────────────────────────────────
  "sidebar.dataNote": "የገበያ ዋጋዎች ከብሔራዊ የገበያ መረጃ ሥርዓት (NMIS) የሚመጡ ሲሆን በAgri-Stack 360 በየቀኑ ይታደሳሉ።",

  // ── Glossary: crops, regions, units, categories, months ────────────────
  "crop.avocado": "አቮካዶ",
  "crop.banana": "ሙዝ",
  "crop.bean": "ቦሎቄ",
  "crop.garlic": "ነጭ ሽንኩርት",
  "crop.green_mung": "ማሾ",
  "crop.local_rice": "የአገር ውስጥ ሩዝ",
  "crop.maize": "በቆሎ",
  "crop.malt_barely": "የቢራ ገብስ",
  "crop.malt_barley": "የቢራ ገብስ",
  "crop.barley": "ገብስ",
  "crop.mango": "ማንጎ",
  "crop.onion": "ቀይ ሽንኩርት",
  "crop.pineapple": "አናናስ",
  "crop.potato": "ድንች",
  "crop.red_pepper": "በርበሬ",
  "crop.sesame": "ሰሊጥ",
  "crop.sorghum": "ማሽላ",
  "crop.soybean": "አኩሪ አተር",
  "crop.teff": "ጤፍ",
  "crop.tomato": "ቲማቲም",
  "crop.wheat": "ስንዴ",
  "crop.coffee": "ቡና",
  "crop.chickpea": "ሽምብራ",
  "crop.faba_bean": "ባቄላ",
  "region.addis_ababa": "አዲስ አበባ",
  "region.afar": "አፋር",
  "region.amhara": "አማራ",
  "region.benishangul-gumuz": "ቤኒሻንጉል ጉሙዝ",
  "region.central_ethiopia": "ማዕከላዊ ኢትዮጵያ",
  "region.dire_dawa": "ድሬዳዋ",
  "region.gambela": "ጋምቤላ",
  "region.harari": "ሐረሪ",
  "region.oromia": "ኦሮሚያ",
  "region.sidama": "ሲዳማ",
  "region.somali": "ሶማሌ",
  "region.south_ethiopia": "ደቡብ ኢትዮጵያ",
  "region.south_west_ethiopia": "ደቡብ ምዕራብ ኢትዮጵያ",
  "region.south_west": "ደቡብ ምዕራብ",
  "region.snnp": "ደቡብ ብ/ብ/ሕ",
  "region.tigray": "ትግራይ",
  "unit.quintal": "ኩንታል",
  "unit.kg": "ኪ.ግ",
  "unit.etb": "ብር",
  "category.seeds": "ዘር",
  "category.fertilizer": "ማዳበሪያ",
  "category.fungicide": "ፀረ-ፈንገስ",
  "category.herbicide": "ፀረ-አረም",
  "category.insecticide": "ፀረ-ተባይ",
  "month.1": "ጃንዩ",
  "month.2": "ፌብሩ",
  "month.3": "ማርች",
  "month.4": "ኤፕሪ",
  "month.5": "ሜይ",
  "month.6": "ጁን",
  "month.7": "ጁላይ",
  "month.8": "ኦገስ",
  "month.9": "ሴፕቴ",
  "month.10": "ኦክቶ",
  "month.11": "ኖቬም",
  "month.12": "ዲሴም",
  "time.seconds": "{n} ሰከንድ",
  "time.minutes": "{n} ደቂቃ",
  "time.hoursMinutes": "{h} ሰዓት {m} ደቂቃ",

  // ── Sign in / sign up ──────────────────────────────────────────────────
  "auth.tagline": "ለኢትዮጵያ አርሶ አደሮች፣ ነጋዴዎች እና የልማት ጣቢያ ሰራተኞች የግብርና ገበያ መረጃ።",
  "auth.point1": "በመላ ኢትዮጵያ ከ300 በላይ ገበያዎች ሳምንታዊ የሰብል ዋጋዎች",
  "auth.point2": "መቼ መሸጥ እንዳለብዎ ለመወሰን የሚረዱ የዋጋ ትንበያዎች",
  "auth.point3": "የሰብል ጤና ምርመራ፣ የግብዓት አቅራቢዎች እና የብድር አማራጮች",

  // ── Forms ──────────────────────────────────────────────────────────────
  "form.phone": "ስልክ ቁጥር",
  "form.password": "የይለፍ ቃል",
  "form.passwordPlaceholder": "የይለፍ ቃልዎን ያስገቡ",
  "form.confirmPassword": "የይለፍ ቃል ያረጋግጡ",
  "form.hidePassword": "የይለፍ ቃሉን ደብቅ",
  "form.showPassword": "የይለፍ ቃሉን አሳይ",
  "form.fullName": "ሙሉ ስም",
  "form.language": "ቋንቋ",
  "form.role": "ሚና",

  // ── Sign in ────────────────────────────────────────────────────────────
  "signin.title": "ግባ",
  "signin.subtitle": "ስልክ ቁጥርዎን እና የይለፍ ቃልዎን ያስገቡ።",
  "signin.missing": "ስልክ ቁጥርዎን እና የይለፍ ቃልዎን ያስገቡ።",
  "signin.noAccount": "መለያ የለዎትም?",
  "signin.createOne": "አዲስ ይክፈቱ",
  "signin.demoAccounts": "ፈጣን መግቢያ",  // draft – needs native review

  // ── Sign up ────────────────────────────────────────────────────────────
  "signup.metaTitle": "መለያ ይክፈቱ",
  "signup.title": "መለያዎን ይክፈቱ",
  "signup.subtitle": "ከአንድ ደቂቃ ያነሰ ጊዜ ይወስዳል።",
  "signup.passwordHint": "ቢያንስ 6 ፊደላት",
  "signup.repeatPassword": "የይለፍ ቃሉን ይድገሙ",
  "signup.iAmA": "እኔ",
  "signup.agentNote": "የልማት ጣቢያ ሰራተኛ ነዎት? እንደ አርሶ አደር ይመዝገቡና አስተዳዳሪዎ መለያዎን እንዲቀይር ይጠይቁ።",
  "signup.woredaNote": "የአየር ሁኔታ፣ የዋጋ እና የበሽታ ማስጠንቀቂያዎች ከሚያርሱበት ቦታ ጋር እንዲጣጣሙ ወረዳዎን ይምረጡ።",
  "signup.submit": "መለያ ክፈት",
  "signup.haveAccount": "መለያ አለዎት?",
  "signup.errName": "ሙሉ ስምዎን ያስገቡ።",
  "signup.errPhone": "በ0 የሚጀምር ባለ 10 አሃዝ ስልክ ቁጥር ያስገቡ፤ ለምሳሌ 0911234567።",
  "signup.errPassword": "የይለፍ ቃሉ ቢያንስ 6 ፊደላት መሆን አለበት።",
  "signup.errMismatch": "ሁለቱ የይለፍ ቃላት አይመሳሰሉም።",
  "signup.errRegion": "ክልልዎን ይምረጡ።",

  // ── Market insights (plain-language analysis) ──────────────────────────
  "ins.thisCrop": "ይህ ሰብል",
  "ins.unit": "መለኪያ",
  "ins.cropInRegion": "{crop} በ{region}",
  "ins.ts.up": "የ{crop} ዋጋ በዚህ ጊዜ ውስጥ በ{pct}% ጨምሯል።",
  "ins.ts.down": "የ{crop} ዋጋ በዚህ ጊዜ ውስጥ በ{pct}% ቀንሷል።",
  "ins.ts.flat": "የ{crop} ዋጋ በዚህ ጊዜ ውስጥ ብዙም አልተለወጠም።",
  "ins.ts.rising": "ዋጋዎች እየጨመሩ ነው። ይህ ብዙውን ጊዜ ገዢዎች መብዛታቸውን ወይም በገበያ ያለው ምርት ማነሱን ያሳያል።",
  "ins.ts.slowUp": "ዋጋዎች በዝግታ እየጨመሩ ነው። መጠነኛ ጭማሪ ነው — ገበያው ትንሽ እየተወደደ ነው።",
  "ins.ts.falling": "ዋጋዎች እየቀነሱ ነው። ይህ ብዙውን ጊዜ ብዙ ምርት መኖሩን ወይም አሁን ገዢዎች ማነሳቸውን ያሳያል።",
  "ins.ts.slowDown": "ዋጋዎች በዝግታ እየቀነሱ ነው። ወደ ገበያ ተጨማሪ ምርት እየገባ ሊሆን ይችላል።",
  "ins.ts.steady": "ዋጋዎች የተረጋጉ ናቸው። ገበያው ብዙም አልተለወጠም — ገዢዎችና ሻጮች በግምት ተመጣጣኝ ናቸው።",
  "ins.ts.belowPeak": "ከፍተኛው ዋጋ በ{month} {peak} ነበር። የዛሬው ዋጋ ({now}) ከዚያ ከፍተኛ ዋጋ በ{pct}% ያነሰ ነው።",
  "ins.ts.nearPeak": "ዋጋዎች ለመጨረሻ ጊዜ በ{month} ከታየው ከፍተኛ ዋጋ {peak} አጠገብ ናቸው። ገበያው አሁን ጠንካራ ነው።",
  "ins.ts.volatile": "ዋጋዎች ከሳምንት ሳምንት በጣም ይወጣሉ ይወርዳሉ። የሚያገኙትን ዋጋ መገመት ከባድ ነው። በአንድ ጊዜ ሳይሆን በትንሽ በትንሹ ለመሸጥ ይሞክሩ።",
  "ins.ts.moderate": "ዋጋዎች ከሳምንት ሳምንት ትንሽ ይለዋወጣሉ፣ ግን ብዙ አይደለም። ይህ ለአብዛኞቹ ሰብሎች የተለመደ ነው።",
  "ins.ts.stable": "ዋጋዎች በጣም የተረጋጉ ናቸው። ሽያጭዎን በበለጠ እርግጠኝነት ማቀድ ይችላሉ።",
  "ins.ts.momUp": "ባለፉት 4 ሳምንታት ዋጋዎች በፍጥነት እየጨመሩ ነው። ለመሸጥ ጥሩ ጊዜ ሊሆን ይችላል።",
  "ins.ts.momDown": "ባለፉት 4 ሳምንታት ዋጋዎች እየቀነሱ ነው። ዋጋው የበለጠ ከመውረዱ በፊት በቅርቡ ለመሸጥ ያስቡ።",
  "ins.reg.different": "የ{crop} ዋጋ አሁን በክልሎች መካከል በጣም ይለያያል። {max} ከፍተኛውን፣ {min} ዝቅተኛውን ይከፍላል።",
  "ins.reg.similar": "የ{crop} ዋጋ በአብዛኞቹ ክልሎች ተመሳሳይ ነው። በአካባቢዎች መካከል ያለው ልዩነት ትንሽ ነው።",
  "ins.reg.bestWorst": "በ{max} ቢሸጡ ወደ {maxPrice} ገደማ ማግኘት ይችላሉ። በ{min} ዋጋው ዝቅ ያለ ሲሆን {minPrice} ነው። ልዩነቱ በ{unit} {diff} ነው።",
  "ins.reg.average": "በሁሉም {n} ክልሎች አማካይ ዋጋው {price} ነው። በአካባቢዎ ገበያ ከሚቀርብልዎ ዋጋ ጋር ለማነጻጸር ይጠቀሙበት።",
  "ins.reg.converging": "በክልሎች መካከል ያለው ዋጋ ከጊዜ ወደ ጊዜ እየተቀራረበ መጥቷል። አሁን በየትኛው ክልል መሸጥዎ ብዙም አያለያይም።",
  "ins.reg.diverging": "በክልሎች መካከል ያለው ልዩነት ጨምሯል። በትክክለኛው ክልል መሸጥ ከበፊቱ የበለጠ ገቢዎን ይለውጣል።",
  "ins.reg.bigGap": "በክልሎች መካከል ያለው የዋጋ ልዩነት በጣም ትልቅ ነው ({pct}%)። የትራንስፖርት ወጪ ከፈቀደ ከ{min} ይልቅ በ{max} መሸጥ በጣም የበለጠ ሊያስገኝልዎ ይችላል።",
  "ins.reg.close": "ዋጋዎች በሁሉም ክልሎች በጣም ተቀራራቢ ናቸው። በአቅራቢያዎ ባለው ገበያ መሸጥ ምናልባት የተሻለ ነው — ርቆ በመሄድ የሚገኝ ትርፍ ትንሽ ነው።",
  "ins.spr.large": "የሱቅ ገዢዎች ለ{crop} አርሶ አደሮች ከሚያገኙት በጣም የበለጠ ይከፍላሉ። ደላሎች ትልቅ ድርሻ ይወስዳሉ።",
  "ins.spr.medium": "የ{crop} የሱቅ ዋጋ አርሶ አደሮች ከሚከፈላቸው በ{pct}% ገደማ ከፍ ያለ ነው።",
  "ins.spr.small": "ለ{crop} በማሳ ዋጋ እና በሱቅ ዋጋ መካከል ያለው ልዩነት ትንሽ ነው። አርሶ አደሮች ተገቢ ድርሻቸውን እያገኙ ነው።",
  "ins.spr.fact": "ለእያንዳንዱ የተሸጠ {unit} {crop}፣ የሱቁ ዋጋ አርሶ አደሩ ከሚያገኘው በ{amount} ይበልጣል። ይህ የ{pct}% ልዩነት ነው። ይህንን መጠን ነጋዴዎች፣ ትራንስፖርት እና አያያዝ ይወስዱታል።",
  "ins.spr.growing": "በማሳ ዋጋ እና በሱቅ ዋጋ መካከል ያለው ልዩነት እየሰፋ ነው። አርሶ አደሮች ከመጨረሻው ዋጋ የሚያገኙት ድርሻ እያነሰ ነው።",
  "ins.spr.shrinking": "በማሳ ዋጋ እና በሱቅ ዋጋ መካከል ያለው ልዩነት እየጠበበ ነው። አርሶ አደሮች ከመጨረሻው ዋጋ የተሻለ ድርሻ እያገኙ ነው።",
  "ins.spr.same": "በማሳ ዋጋ እና በሱቅ ዋጋ መካከል ያለው ልዩነት ብዙም አልተለወጠም። የትርፍ ክፍፍሉ ላይ ትልቅ ለውጥ የለም።",
  "ins.spr.veryHigh": "በማሳ እና በገበያ ዋጋ መካከል ያለው ልዩነት በጣም ከፍተኛ ነው ({pct}%)። ከተቻለ ለአካባቢው ነጋዴዎች ሳይሆን በአቅራቢያ ባለ የከተማ ገበያ በቀጥታ ለመሸጥ ይሞክሩ። ይህ የበለጠ ገቢ ሊያስገኝልዎ ይችላል።",
  "ins.spr.fair": "በማሳ እና በሱቅ ዋጋ መካከል ያለው ልዩነት ትንሽ ነው። ይህ ጥሩ ነው — ነጋዴዎች ከገቢዎ ብዙ እየወሰዱ አይደለም ማለት ነው።",
  "ins.time.week1": "1 ሳምንት",
  "ins.time.weeks": "{n} ሳምንታት",
  "ins.time.month1": "1 ወር ገደማ",
  "ins.time.months2": "2 ወር ገደማ",
  "ins.time.months3": "3 ወር ገደማ",
  "ins.action.wait": "ለመሸጥ ይጠብቁ",
  "ins.action.hold": "ለጊዜው ያቆዩ",
  "ins.action.sellNow": "አሁን ይሽጡ",
  "ins.action.sellSoon": "በቅርቡ ይሽጡ",
  "ins.action.sellUrgently": "በአስቸኳይ ይሽጡ",
  "ins.fc.up": "የ{crop} ዋጋ በ{region} በሚቀጥሉት {time} ውስጥ በ{pct}% ገደማ ይጨምራል ተብሎ ይጠበቃል። መጠበቅ የበለጠ ገንዘብ ሊያስገኝልዎ ይችላል።",
  "ins.fc.down": "የ{crop} ዋጋ በ{region} በሚቀጥሉት {time} ውስጥ በ{pct}% ገደማ ይቀንሳል ተብሎ ይጠበቃል። ቶሎ መሸጥ የበለጠ አስተማማኝ ነው።",
  "ins.fc.flat": "የ{crop} ዋጋ በ{region} በሚቀጥሉት {time} ውስጥ ብዙም አይለወጥም ተብሎ ይጠበቃል። ትልቅ ለውጥ አልተተነበየም።",
  "ins.fc.adviceWait": "ዋጋዎች እየጨመሩ ነው። ከመሸጥዎ በፊት {time} መጠበቅ ከቻሉ ከዛሬው ዋጋ በ{pct}% ገደማ የበለጠ ሊያገኙ ይችላሉ። ይህን የሚያደርጉት ምርትዎን በአስተማማኝ ሁኔታ ማከማቸት ከቻሉ ብቻ ነው።",
  "ins.fc.adviceNow": "ዋጋዎች ብዙ ይለወጣሉ ተብሎ አይጠበቅም። ለመጠበቅ ጠንካራ ምክንያት የለም። አሁን መሸጥ ያለምንም ስጋት የዛሬውን ተገቢ ዋጋ ያስገኝልዎታል።",
  "ins.fc.adviceSoon": "ዋጋዎች እየቀነሱ ነው። በቆዩ ቁጥር የሚያገኙት ሊቀንስ ይችላል። ምርትዎን በተቻለ ፍጥነት ለመሸጥ ይሞክሩ።",
  "ins.fc.uncertainHigh": "ይህ ትንበያ እርግጠኛ አይደለም። ዋጋዎች ከተጠበቀው በላይ ወይም በታች ሊሆኑ ይችላሉ። ጥሩው መንገድ ከፊሉን አሁን ከፊሉን በኋላ መሸጥ ነው — ሁሉንም በአንድ ጊዜ አይሽጡ።",
  "ins.fc.uncertainMid": "በዚህ ትንበያ ውስጥ የተወሰነ እርግጠኛ አለመሆን አለ። አቅጣጫው ትክክል ሊሆን ይችላል፣ ትክክለኛው ዋጋ ግን ሊለያይ ይችላል። ገበያውን በየሳምንቱ ይከታተሉ።",
  "ins.fc.reliable": "ይህ ትንበያ በአንጻራዊነት አስተማማኝ ነው። የዋጋው አቅጣጫ በጠንካራ የገበያ መረጃ ላይ የተመሰረተ ነው።",
  "ins.fc.dataHigh": "ይህ ትንበያ የ{n} ሳምንታት ያለፈ የገበያ መረጃ ይጠቀማል። ይህ ብዙ ታሪክ ስለሆነ ትንበያው የሚታመን ነው።",
  "ins.fc.dataMedium": "ይህ ትንበያ በ{n} ሳምንታት ያለፈ መረጃ ላይ የተመሰረተ ነው። ጥሩ መመሪያ ነው ግን ፍጹም አይደለም።",
  "ins.fc.dataLow": "ለዚህ ሰብልና ክልል ያለን ያለፈ መረጃ {n} ሳምንታት ብቻ ነው። እንደ ግምታዊ መመሪያ ይጠቀሙበትና ለበለጠ መረጃ የአካባቢዎን የገበያ ባለሙያ ይጠይቁ።",
  "ins.fc.dataVeryLow": "ለዚህ ሰብል ያለን ያለፈ መረጃ በጣም ትንሽ ነው ({n} ሳምንታት)። ይህ ትንበያ ግምት ብቻ ነው። ትልቅ ውሳኔ ከማድረግዎ በፊት የአካባቢውን ነጋዴ ያነጋግሩ።",
  "ins.fc.growMore": "ለሚቀጥለው ወቅት ተጨማሪ {crop} ማምረት ጥሩ ሀሳብ ይመስላል። ዋጋዎች ከፍ ይላሉ ተብሎ ስለሚጠበቅ ምርትዎ የበለጠ ያስገኛል።",
  "ins.fc.growCareful": "አሁን ብዙ {crop} ከማምረትዎ በፊት ይጠንቀቁ። የሚቀጥለው ምርትዎ ሲደርስ ዋጋዎች ዝቅ ሊሉ ይችላሉ። ተጨማሪ ከመዝራትዎ በፊት ገዢዎችን ወይም የኅብረት ሥራ ማኅበራትን ያነጋግሩ።",
  "ins.fc.growSafe": "ለሚቀጥለው ወቅት {crop} ማምረት አስተማማኝ ምርጫ ነው። ዋጋዎች የተረጋጉ ስለሆኑ ገቢዎ የሚገመት ነው።",

  // ── Dashboard ──────────────────────────────────────────────────────────
  "weekday.0": "እሑድ",
  "weekday.1": "ሰኞ",
  "weekday.2": "ማክሰኞ",
  "weekday.3": "ረቡዕ",
  "weekday.4": "ሐሙስ",
  "weekday.5": "ዓርብ",
  "weekday.6": "ቅዳሜ",
  "dash.meta": "የገበያ አጠቃላይ እይታዎ",
  "dash.morning": "እንደምን አደሩ፣ {name}",
  "dash.afternoon": "እንደምን ዋሉ፣ {name}",
  "dash.evening": "እንደምን አመሹ፣ {name}",
  "dash.setRegion": "ክልልዎን ይምረጡ",
  "dash.loadingPrices": "የዚህን ሳምንት ዋጋዎች በመጫን ላይ…",
  "dash.noRecentPrices": "በ{region} የቅርብ ጊዜ ዋጋ የለም",
  "dash.sellingAdvice": "የሽያጭ ምክር፦ {crop} በ{region}",
  "dash.basedOnForecast": "በ4 ሳምንት የዋጋ ትንበያ ላይ የተመሰረተ",
  "dash.fullForecast": "ሙሉ ትንበያ",
  "dash.checkingForecast": "ትንበያውን በማየት ላይ…",
  "dash.forecastUnavailable": "ትንበያ አይገኝም",
  "dash.notEnoughData": "በቂ መረጃ የለም",
  "dash.cannotForecast": "የ{crop} ዋጋን በ{region} ገና መተንበይ አንችልም።",
  "dash.todayToForecast": "ዛሬ {now} → በ4 ሳምንት ውስጥ {later} ገደማ",
  "dash.allFarms": "ሁሉም ማሳዎች",
  "dash.farmsIn": "ማሳዎች በ{region}",
  "dash.farmsInYourRegion": "በክልልዎ ያሉ ማሳዎች",
  "dash.myFarms": "የእኔ ማሳዎች",
  "dash.manage": "አስተዳድር",
  "dash.noFarmsAll": "እስካሁን ማሳ የመዘገበ አርሶ አደር የለም።",
  "dash.noFarmsRegion": "በ{region} እስካሁን ማሳ የመዘገበ አርሶ አደር የለም።",
  "dash.askRegion": "ክልልዎን እንዲመድብልዎ አስተዳዳሪን ይጠይቁ።",
  "dash.noFarmsYet": "እስካሁን ማሳ የለም",
  "dash.addFieldsHint": "የሰብል ጤና ምርመራ እና የተሻለ የብድር አማራጭ ለማግኘት ማሳዎችዎን ይመዝግቡ።",
  "dash.addFarm": "ማሳ ጨምር",
  "dash.noFarmsToShow": "የሚታይ ማሳ የለም",
  "dash.quickLinks": "ፈጣን ማገናኛዎች",
  "farm.status.healthy": "ጤናማ",
  "farm.status.warning": "ክትትል ያስፈልገዋል",
  "farm.status.critical": "አሳሳቢ",
  "price.retail": "የችርቻሮ",
  "price.wholesale": "የጅምላ",
  "price.producer": "የአምራች",
  "price.perUnit": "በ{unit}",
  "unit.ha": "ሄ/ር",

  // ── Market Intel ───────────────────────────────────────────────────────
  "market.meta": "የሰብል ዋጋዎች፣ የክልሎች ንጽጽር እና ትንበያዎች",
  "market.description": "በመላ ኢትዮጵያ ካሉ ገበያዎች ሳምንታዊ የሰብል ዋጋዎች። ዋጋዎች እንዴት እንደሚለዋወጡ ለማየት ሰብልና ክልል ይምረጡ።",
  "market.view.trend": "የዋጋ አዝማሚያ",
  "market.view.regional": "ክልሎችን አነጻጽር",
  "market.view.heatmap": "ገበያዎችን አነጻጽር",
  "market.view.spread": "የማሳ እና የሱቅ ዋጋ",
  "market.view.forecast": "ትንበያ",
  "market.views": "የገበያ እይታዎች",
  "market.level.retail": "ችርቻሮ (የሱቅ ዋጋ)",
  "market.level.wholesale": "ጅምላ",
  "market.level.producer": "አምራች (የማሳ በር ዋጋ)",
  "market.range.3": "ያለፉት 3 ወራት",
  "market.range.6": "ያለፉት 6 ወራት",
  "market.range.12": "ያለፉት 12 ወራት",
  "market.range.24": "ያለፉት 2 ዓመታት",
  "market.range.all": "ሙሉ ታሪክ",
  "market.range.custom": "የራስዎ ቀናት",
  "confidence.high": "ከፍተኛ እርግጠኝነት",
  "confidence.medium": "መካከለኛ እርግጠኝነት",
  "confidence.low": "ዝቅተኛ እርግጠኝነት",
  "confidence.veryLow": "በጣም ዝቅተኛ እርግጠኝነት",
  "market.loadingMeta": "ሰብሎችንና ገበያዎችን በመጫን ላይ…",
  "market.unavailable": "የገበያ መረጃ አይገኝም",
  "market.crop": "ሰብል",
  "market.variety": "ዝርያ",
  "market.allVarieties": "ሁሉም ዝርያዎች",
  "market.allRegions": "ሁሉም ክልሎች",
  "market.allRegionsLower": "ሁሉም ክልሎች",
  "market.priceType": "የዋጋ ዓይነት",
  "market.timePeriod": "የጊዜ ወሰን",
  "market.from": "ከ",
  "market.to": "እስከ",
  "market.dataAvailable": "የ{crop} መረጃ ከ{from} እስከ {to} ይገኛል · {n} የዋጋ መዝገቦች",
  "market.latestPrice": "የቅርብ ጊዜ የ{level} ዋጋ",
  "market.weekOf": "የ{date} ሳምንት",
  "market.changeWeek": "ካለፈው ሳምንት ለውጥ",
  "market.wentUp": "ዋጋዎች ጨምረዋል",
  "market.wentDown": "ዋጋዎች ቀንሰዋል",
  "market.noChange": "ለውጥ የለም",
  "market.avg4": "አማካይ፣ ያለፉት 4 ሳምንታት",
  "market.wholePeriod": "የጠቅላላው ጊዜ {price}",
  "market.records": "በጊዜው ያሉ የዋጋ መዝገቦች",
  "market.supplySignal": "የአቅርቦት ምልክት፦ {signal}",
  "market.trend.title": "የ{crop} {level} ዋጋ በጊዜ ሂደት",
  "market.trend.description": "በ{region} አማካይ። የተጠላው ክፍል በየሳምንቱ ዝቅተኛውንና ከፍተኛውን የገበያ ዋጋ ያሳያል።",
  "market.loadingPrices": "ዋጋዎችን በመጫን ላይ…",
  "market.noPrices": "ምንም ዋጋ አልተገኘም",
  "market.noPricesHint": "ሌላ ክልል፣ የዋጋ ዓይነት ወይም ረዘም ያለ ጊዜ ይሞክሩ።",
  "market.marketRange": "የገበያ ክልል",
  "market.averagePrice": "አማካይ ዋጋ",
  "market.regional.title": "የ{crop} ዋጋ በክልል",
  "market.regional.description": "አሁን ዋጋው ከፍተኛ የሆነው የት ነው? እያንዳንዱ መስመር በዚያ ክልል ያሉ ገበያዎች አማካይ ነው።",
  "market.comparingRegions": "ክልሎችን በማነጻጸር ላይ…",
  "market.noRegional": "የክልል ዋጋዎች አልተገኙም",
  "market.noRegionalHint": "ረዘም ያለ ጊዜ ወይም ሌላ የዋጋ ዓይነት ይሞክሩ።",
  "market.spread.title": "አርሶ አደሮች የሚያገኙት እና ሸማቾች የሚከፍሉት",
  "market.spread.description": "በሁለቱ መስመሮች መካከል ያለው ልዩነት ነጋዴዎች፣ ትራንስፖርት እና አያያዝ የሚወስዱት ነው።",
  "market.loadingSpread": "የማሳ እና የሱቅ ዋጋዎችን በመጫን ላይ…",
  "market.noSpread": "በቂ የማሳ በር ዋጋ የለም",
  "market.noSpreadHint": "የአምራች ዋጋ የሚሰበሰበው በአንዳንድ ገበያዎች ብቻ ነው። ሌላ ክልል ወይም ረዘም ያለ ጊዜ ይሞክሩ።",
  "market.coverage": "ለዚህ ምርጫ የማሳ በር ዋጋ የሚያቀርቡት {pct}% ገበያዎች ብቻ ስለሆኑ ልዩነቱን እንደ ግምታዊ መመሪያ ይውሰዱት።",
  "market.shopPrice": "የሱቅ ዋጋ",
  "market.farmPrice": "የማሳ ዋጋ",
  "market.gap": "ልዩነት",
  "market.shopPriceRetail": "የሱቅ ዋጋ (ችርቻሮ)",
  "market.farmPriceProducer": "የማሳ ዋጋ (አምራች)",
  "market.fc.title": "የ{crop} ዋጋ ትንበያ — {region}",
  "market.fc.description": "ለሚቀጥሉት ሳምንታት የሚጠበቀው የችርቻሮ ዋጋ። የተጠላው ክፍል ሊሆን የሚችለውን ክልል ያሳያል።",
  "market.fc.region": "የትንበያ ክልል",
  "market.fc.weeksAhead": "ወደፊት ሳምንታት",
  "market.fc.calculating": "ትንበያውን በማስላት ላይ…",
  "market.fc.none": "ትንበያ አይገኝም",
  "market.fc.noneHint": "ለዚህ ሰብልና ክልል በቂ ታሪክ የለም።",
  "market.fc.ourAdvice": "የእኛ ምክር",
  "market.fc.priceToday": "የዛሬ ዋጋ",
  "market.fc.expectedIn": "በ{n} ሳምንታት የሚጠበቅ",
  "market.fc.likelyRange": "ሊሆን የሚችል ክልል",
  "market.fc.expectedPrice": "የሚጠበቅ ዋጋ",
  "market.fc.model": "ሞዴል፦ {model}",
  "market.fc.levelPrices": "የ{level} ዋጋዎች",
  "market.fc.shouldSell": "አሁን መሸጥ አለብዎት?",

  // ── Market heatmap ─────────────────────────────────────────────────────
  "insight.title": "ይህ ለእርስዎ ምን ማለት ነው",
  "heat.title": "የ{crop} ዋጋ በገበያ",
  "heat.titleRegion": "የ{crop} ዋጋ በገበያ — {region}",
  "heat.description": "እያንዳንዱ ረድፍ አንድ ገበያ፣ እያንዳንዱ ካሬ አንድ ሳምንት ነው። ሞቃት ቀለሞች ከፍተኛ ዋጋን፣ ቀዝቃዛ ቀለሞች ዝቅተኛ ዋጋን ያሳያሉ።",
  "heat.sort": "ገበያዎችን ደርድር",
  "heat.sortPrice": "ከፍተኛ ዋጋ መጀመሪያ",
  "heat.sortName": "ሀ–ፐ",
  "heat.chooseRegion": "ክልል ይምረጡ",
  "heat.chooseRegionHint": "ይህ ሰንጠረዥ ገበያዎችን አንድ በአንድ ስለሚያነጻጽር አንድ ክልል በአንድ ጊዜ ያስፈልገዋል።",
  "heat.building": "የገበያ ሰንጠረዡን በማዘጋጀት ላይ…",
  "heat.noPrices": "የገበያ ዋጋዎች አልተገኙም",
  "heat.noPricesHint": "ሌላ የዋጋ ዓይነት ወይም ረዘም ያለ ጊዜ ይሞክሩ።",
  "heat.size": "{markets} ገበያዎች × {weeks} ሳምንታት",
  "heat.showingTop": "በብዛት ሪፖርት የሚያደርጉ {n} ገበያዎች ይታያሉ (ከ{total})",
  "heat.noReport": "ሪፖርት የለም",
  "heat.aria": "የዋጋ ሰንጠረዥ በገበያ እና በሳምንት",
  "heat.noPriceReported": "ዋጋ አልተመዘገበም",
  "heat.whereToSell": "የት መሸጥ ይሻላል",
  "heat.ins.recent": "ባለፉት {weeks} ሳምንታት {top} ወደ {topPrice} ገደማ ከፍሏል። {bottom} ወደ {bottomPrice} ገደማ ከፍሏል።",
  "heat.ins.difference": "ይህ በአንድ ክልል ውስጥ ባሉ ገበያዎች መካከል በ{unit} {diff} ({pct}%) ልዩነት ነው።",
  "heat.ins.bigGap": "በአቅራቢያ ባሉ ገበያዎች መካከል ዋጋው በጣም ይለያያል። ከፍተኛ ዋጋ ወዳለው ገበያ መድረስ ከቻሉ የትራንስፖርት ወጪ ታስቦም ጉዞው ሊያዋጣ ይችላል።",
  "heat.ins.similar": "በዚህ ክልል ያሉ ገበያዎች ተመሳሳይ ዋጋ ይከፍላሉ። በአቅራቢያዎ ባለው ገበያ መሸጥ ብዙውን ጊዜ የተሻለ ነው።",
  "heat.ins.others": "አሁን ከፍተኛ የሚከፍሉ ሌሎች ገበያዎች፦ {markets}።",
  "heat.ins.headline": "አሁን ለ{crop} በ{region} ከፍተኛውን እየከፈለ ያለው {market} ነው።",
  "area.chooseRegion": "ክልል ይምረጡ",

  // ── AI advisor ─────────────────────────────────────────────────────────
  "advisor.meta": "ከግብርና ሚኒስቴር መመሪያዎች የተገኙ መልሶች",
  "advisor.description": "በአማርኛ፣ በአፋን ኦሮሞ፣ በትግርኛ ወይም በእንግሊዝኛ ይጠይቁ። መልሶቹ ከግብርና ሚኒስቴር መመሪያዎች እና ከማሳዎ መረጃ የሚገኙ ሲሆን ምንጫቸውም ይጠቀሳል።",
  "advisor.title": "የእርሻ አማካሪ",
  "advisor.subtitle": "የግብርና ሚኒስቴር የስንዴ መመሪያዎች · የአየር ሁኔታ · የገበያ ዋጋ",
  "advisor.panelSubtitle": "የግብርና ሚኒስቴር መመሪያዎች · የአየር ሁኔታ · ዋጋ — አማርኛ, Afaan Oromoo, ትግርኛ, English",
  "advisor.newChat": "አዲስ ውይይት",
  "advisor.emptyTitle": "የእርሻ አማካሪዎን ይጠይቁ",
  "advisor.emptyBody": "እያንዳንዱ መልስ ከየት እንደመጣ ያሳያል። መመሪያዎቹ ጥያቄዎን ካልሸፈኑ ከመገመት ይልቅ ወደ ልማት ጣቢያ ሰራተኛዎ ይላካል።",
  "advisor.tryAsking": "ይህንን ይጠይቁ",
  "advisor.tapToSend": "ለመላክ ጥያቄውን ይንኩ።",
  "advisor.howItWorks": "አማካሪው እንዴት ይሰራል",
  "advisor.how1": "መልሱ ከየትኛው የመመሪያ ገጽ እንደመጣ ለማየት እንደ S1 ያለ የምንጭ ምልክት ይንኩ።",
  "advisor.how2": "የፀረ-ተባይ መጠን በፍጹም አይናገርም። ለርጭት ከሰብል ጤና የሚገኘውን የሕክምና ዕቅድ ይጠቀሙ ወይም የልማት ጣቢያ ሰራተኛዎን ይጠይቁ።",
  "advisor.how3": "ዋጋዎችና ትንበያዎች መመሪያ እንጂ ቃል ኪዳን አይደሉም።",
  "advisor.how4": "መመረዝ ሲያጋጥም የሚታየውን የአደጋ ጊዜ ስልክ ወዲያውኑ ይደውሉ።",
  "advisor.auto": "ራስ-ሰር",
  "advisor.answerLanguage": "የመልስ ቋንቋ",
  "advisor.sourceRef": "ምንጭ {ref}",
  "advisor.openSource": "የምንጭ ሰነዱን ክፈት",
  "advisor.kind.poisoning": "መመረዝ ሊሆን ይችላል — አሁኑኑ እርዳታ ያግኙ።",
  "advisor.kind.refusal": "ምርቱ ለአገልግሎት አልተፈቀደም።",
  "advisor.kind.dontKnow": "በመመሪያዎቹ አልተሸፈነም።",
  "advisor.kind.person": "ከሰው ጋር በማገናኘት ላይ።",
  "advisor.kind.unavailable": "አማካሪው አሁን አይገኝም።",
  "advisor.escalated": "ጥያቄዎ ለልማት ጣቢያ ሰራተኛዎ ተልኳል።",
  "advisor.hideSources": "ምንጮችን ደብቅ",
  "advisor.source": "{n} ምንጭ",
  "advisor.sources": "{n} ምንጮች",
  "advisor.thanks": "ለአስተያየትዎ እናመሰግናለን",
  "advisor.helpful?": "ይህ ጠቃሚ ነበር?",
  "advisor.helpful": "ጠቃሚ ነው",
  "advisor.notHelpful": "ጠቃሚ አይደለም",
  "advisor.unreachable": "አማካሪውን ማግኘት አልተቻለም። ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።",
  "advisor.open": "የእርሻ አማካሪውን ክፈት",
  "advisor.close": "የእርሻ አማካሪውን ዝጋ",
  "advisor.chat": "ከእርሻ አማካሪው ጋር ውይይት",
  "advisor.openFull": "ሙሉውን የAI ምክር ገጽ ክፈት",
  "advisor.panelWelcome": "ስለ ሰብልዎ፣ ማዳበሪያ፣ ውሃ ማጠጣት፣ በሽታ ወይም የገበያ ዋጋ ይጠይቁ — በአማርኛ፣ በአፋን ኦሮሞ፣ በትግርኛ ወይም በእንግሊዝኛ። እያንዳንዱ መልስ ምንጩን ያሳያል።",
  "advisor.typeQuestion": "ጥያቄዎን ይጻፉ…",
  "advisor.typing": "አማካሪው እየጻፈ ነው",
  "advisor.message": "መልእክት",
  "advisor.send": "መልእክት ላክ",
  "alerts.label": "ማስጠንቀቂያዎች",
  "alerts.checkWithPhoto": "ማሳዬን በፎቶ ልመርምር",
  "alerts.dismiss": "ማስጠንቀቂያውን ዝጋ",
  "area.chooseZone": "ዞን ይምረጡ",
  "area.chooseWoreda": "ወረዳ ይምረጡ",
  "area.regionFirst": "መጀመሪያ ክልል ይምረጡ",
  "area.zoneFirst": "መጀመሪያ ዞን ይምረጡ",
  "area.loadFailed": "የአካባቢዎችን ዝርዝር መጫን አልተቻለም። ግንኙነትዎን ያረጋግጡ።",

  // ── Crop health ────────────────────────────────────────────────────────
  "demo.title": "አመላካች መረጃ፦ ከመጠቀምዎ በፊት ያረጋግጡ",  // draft – needs native review
  "demo.message": "እዚህ የሚታዩት {subject} አመላካች ናቸው። ከመግዛትዎ ወይም ከመርጨትዎ በፊት ከምርቱ መለያና ከወቅታዊው የEAA መዝገብ ጋር ያረጋግጡ፤ ከልማት ጣቢያ ሰራተኛዎም ጋር ይመካከሩ።",  // draft – needs native review
  "demo.subject.products": "የምርት ስሞች እና መጠኖች",
  "demo.subject.suppliers": "አቅራቢዎች፣ ምርቶች እና ዋጋዎች",
  "demo.subject.textDiagnosis": "በጽሑፍ የተሰጡ ምርመራዎች፣ የምርት ስሞች እና መጠኖች",
  "demo.message.loans": "እዚህ የሚታዩት አበዳሪዎች፣ የብድር ዓይነቶችና የወለድ መጠኖች አመላካች ናቸው። ከማመልከትዎ በፊት ውሉን ከባንኩ ወይም ከጥቃቅን ፋይናንስ ተቋሙ ጋር ያረጋግጡ።",  // draft – needs native review
  "photo.outOfStock": "ክምችት የለም",  // draft – needs native review
  "photo.sources": "ምንጮች፦ {list}",  // draft – needs native review
  "unit.km": "ኪ.ሜ",  // draft – needs native review
  "unit.lPerHa": "ሊትር/ሄ/ር",  // draft – needs native review
  "severity.low": "ዝቅተኛ",
  "severity.moderate": "መካከለኛ",
  "severity.high": "ከፍተኛ",
  "severity.critical": "አሳሳቢ",
  "crop.meta": "ሰብሎችዎን ለበሽታ ይመርምሩ",
  "crop.description": "የታመሙትን ቅጠሎች ፎቶ ያንሱ። የAI ሞዴሉ ፎቶውን ከማሳዎ ከፍታ እና የአየር ሁኔታ ጋር አጣምሮ ይመረምርና የሕክምና ዕቅድ ይሰጣል።",
  "crop.example1": "ከተክሉ ታች ጀምሮ በቅጠሎቹ ላይ ቢጫ መስመሮች",
  "crop.example2": "በቅጠሎቹ ላይ ቢጫ ቀለበት ያላቸው ቡናማ ነጠብጣቦች",
  "crop.example3": "ተክሎቹ እየወደቁ ነው፣ አገዳዎቹም ደካማ ይመስላሉ",
  "crop.describeMore": "እባክዎ የሚያዩትን ትንሽ በዝርዝር ይግለጹ (ቢያንስ አጭር ዓረፍተ ነገር)።",
  "crop.loadingFarms": "ማሳዎችዎን በመጫን ላይ…",
  "crop.addFarmFirst": "መጀመሪያ ማሳ ይመዝግቡ",
  "crop.noFarms": "ለምርመራ የሚሆን ማሳ ገና የለም",
  "crop.addFarmHint": "የሰብል ጤና ምርመራ ከአንዱ ማሳዎ ጋር ስለሚያያዝ በጊዜ ሂደት መከታተል እንችላለን።",
  "crop.noFarmsRegion": "በ{region} እስካሁን ማሳ የመዘገበ አርሶ አደር የለም። ሲመዘግቡ ማሳዎቻቸው እዚህ ይታያሉ።",
  "crop.noRegion": "ክልል አልተመደበልዎትም። ክልልዎን እንዲመድብልዎ አስተዳዳሪን ይጠይቁ።",
  "crop.goToProfile": "ወደ መገለጫዬ ሂድ",
  "crop.checkField": "ማሳ ይመርምሩ",
  "crop.mode.photo": "በፎቶ መመርመር",
  "crop.mode.describe": "ይግለጹ (ቤታ)",  // draft – needs native review
  "crop.whichField": "የትኛው ማሳ?",
  "crop.whatDoYouSee": "ምን ያያሉ?",
  "crop.describePlaceholder": "ቅጠሉን፣ አገዳውን ወይም ፍሬውን ይግለጹ፦ ቀለም፣ ነጠብጣብ፣ ከየት እንደጀመረ፣ ምን ያህል የማሳው ክፍል…",
  "crop.checkMyCrop": "ሰብሌን መርምር",
  "crop.history": "የጤና ታሪክ",
  "crop.historyHint": "ለማሳዎችዎ የተቀመጡ ምርመራዎች",
  "crop.noHistory": "እስካሁን የተቀመጠ ምርመራ የለም",
  "crop.noHistoryHint": "በማሳዎችዎ ላይ ያሉ ችግሮችን ለመከታተል ምርመራውን ያስቀምጡ።",
  "crop.causedBy": "መንስኤው {pathogen}",
  "crop.risk": "{level} ስጋት",
  "crop.match": "{pct}% ተዛማጅ",
  "crop.signs": "የሚታዩ ምልክቶች",
  "crop.whatToDoDemo": "ምን ማድረግ እንዳለብዎ (ቤታ)",  // draft – needs native review
  "crop.checkAgain": "ማሳውን በ{date} እንደገና ይመርምሩ።",
  "crop.guideOnly": "ይህ መመሪያ ብቻ ነው — ለከባድ ችግሮች የልማት ጣቢያ ሰራተኛዎን ይደውሉ።",
  "crop.saved": "በታሪክ ተቀምጧል",
  "crop.saveToHistory": "በታሪክ አስቀምጥ",
  "crop.resolved": "ተፈቷል",
  "crop.markSolved": "እንደተፈታ ምልክት አድርግ",

  // ── Photo diagnosis ────────────────────────────────────────────────────
  "photo.cond.altitude": "ከፍታ",
  "photo.cond.temperature": "የሙቀት መጠን (ያለፈው ሳምንት)",
  "photo.cond.humidity": "እርጥበት (ያለፈው ሳምንት)",
  "photo.cond.rain": "ዝናብ (ያለፈው ሳምንት)",
  "photo.needPhoto": "መጀመሪያ የታመሙትን ቅጠሎች ፎቶ ያንሱ ወይም ይምረጡ።",
  "photo.selectedLeaf": "የተመረጠው ቅጠል",
  "photo.take": "የታመሙትን ቅጠሎች ፎቶ ያንሱ",
  "photo.tips": "በቅርበት፣ በቀን ብርሃን፣ አንድ ቅጠል ፎቶውን አብዛኛውን እንዲሞላ",
  "photo.different": "ሌላ ፎቶ ተጠቀም",
  "photo.showIn": "ውጤቱን በዚህ ቋንቋ አሳይ",
  "photo.check": "ፎቶውን መርምር",
  "photo.whyConditions": "ዋግና ሴፕቶሪያ በአየር ሁኔታ ስለሚወሰኑ የማሳዎን ከፍታ እና ያለፈውን ሳምንት የአየር ሁኔታም እንጠቀማለን።",
  "photo.howDecided": "ሞዴሉ እንዴት እንደወሰነ",
  "photo.photoOnly": "በፎቶ ብቻ",
  "photo.photoOnlyHint": "የቅጠሉ ፎቶ ብቻውን የሚጠቁመው",
  "photo.withConditions": "ፎቶ + የማሳ ሁኔታ",
  "photo.withConditionsHint": "ከፍታ፣ የሙቀት መጠን፣ እርጥበት እና ዝናብ ይጨምራል",
  "photo.conditionsNotUsed": "ጥቅም ላይ አልዋለም፦ የማሳው ሁኔታ አልተገኘም ወይም ሞዴሉ ከሰለጠነበት ክልል ውጭ ነው።",
  "photo.outOfRange": "{value} — ሞዴሉ የሰለጠነው በ{min}–{max} ላይ ነው።",
  "photo.p.dosePerHa": "መጠን በሄክታር",
  "photo.p.perKnapsack": "በአንድ የጀርባ መርጫ",
  "photo.p.water": "ውሃ",
  "photo.p.maxSprays": "ከፍተኛ የርጭት ብዛት",
  "photo.p.interval": "በርጭቶች መካከል ያሉ ቀናት",
  "photo.p.phi": "ከምርት ስብሰባ በፊት ያሉ ቀናት",
  "photo.p.reentry": "ከማሳው ይራቁ",
  "photo.p.rainFree": "ከርጭት በኋላ ዝናብ የሌለበት ጊዜ",
  "photo.hours": "{n} ሰዓት",
  "photo.reg": "ምዝገባ {n}",
  "photo.verified": "የተረጋገጠ",
  "photo.placeholder": "የEAA መዝገብን ያረጋግጡ",  // draft – needs native review
  "photo.ppe": "የመከላከያ ልብስ፦ {items}",
  "photo.sponsored": "ስፖንሰር የተደረገ",
  "photo.notChecked": "ገና በባለሙያ አልተረጋገጠም",
  "photo.notCheckedBody": "መጠኖች ከEAA መዝገብ ጋር እስኪረጋገጡ ድረስ አይታዩም። የምርቱን መለያ ይከተሉ፤ ከመግዛትዎ ወይም ከመርጨትዎ በፊት ከልማት ጣቢያ ሰራተኛዎ ጋር ያረጋግጡ።",  // draft – needs native review
  "photo.inField": "በማሳው ላይ ምን ማድረግ አለብዎት",
  "photo.ifSpray": "መርጨት ካስፈለገ",
  "photo.approvedAI": "የተፈቀዱ ንቁ ንጥረ ነገሮች፦ {list}። የተመዘገበ ምርት ለማግኘት የልማት ጣቢያ ሰራተኛዎን ይጠይቁ።",
  "photo.weather": "የአየር ሁኔታ",
  "photo.whereToBuy": "የት መግዛት ይቻላል (ቅርብ የሆነው መጀመሪያ)",
  "photo.kind.disease": "በሽታ ተገኝቷል",
  "photo.kind.healthy": "ጤናማ ይመስላል",
  "photo.kind.uncertain": "እርግጠኛ አይደለም — በቅርበት መታየት አለበት",
  "photo.kind.invalid": "እባክዎ አዲስ ፎቶ ያንሱ",
  "photo.thankYou": "እናመሰግናለን።",
  "photo.daVisit": "የልማት ጣቢያ ሰራተኛዎ እንዲጎበኝዎ ተጠይቋል።",
  "photo.outcome.better": "ተሻሽሏል",
  "photo.outcome.same": "እንዳለ ነው",
  "photo.outcome.worse": "ተባብሷል",
  "photo.howNow": "ማሳው አሁን እንዴት ነው?",
  "photo.sure": "{pct} እርግጠኛ",
  "photo.daCheck": "የልማት ጣቢያ ሰራተኛዎ ይህንን ማሳ እንዲመረምር ተጠይቋል።",
  "photo.untilThen": "እስከዚያው ድረስ",
  "photo.askAgain": "በ{date} እንደገና እንጠይቅዎታለን።",
  "model.brown_rust": "የቅጠል ዋግ",
  "model.healthy": "ጤናማ",
  "model.invalid": "የስንዴ ቅጠል አይደለም",
  "model.powdery_mildew": "ዱቄታማ ሻጋታ",
  "model.septoria": "ሴፕቶሪያ",
  "model.yellow_rust": "ቢጫ ዋግ",
  "ppe.boots": "ቦት ጫማ",
  "ppe.gloves": "ጓንት",
  "ppe.goggles": "የዓይን መነጽር",
  "ppe.long_sleeves": "ረጅም እጅጌ ልብስ",
  "ppe.mask": "ማስክ",
  "ppe.coverall": "ሙሉ ቱታ",
  "ppe.respirator": "የመተንፈሻ መከላከያ",

  // ── Input suppliers ────────────────────────────────────────────────────
  "inputs.meta": "የዘር፣ የማዳበሪያ እና የኬሚካል አቅራቢዎችን ያግኙ",
  "inputs.description": "በአቅራቢያዎ ዘር፣ ማዳበሪያ እና የሰብል ኬሚካሎችን ያግኙ። ለማነጻጸር ሁለት ወይም ከዚያ በላይ አቅራቢዎችን ይምረጡ።",
  "inputs.myRegion": "የእኔ ክልል ({region})",
  "inputs.productType": "የምርት ዓይነት",
  "inputs.allProducts": "ሁሉም ምርቶች",
  "inputs.searchPlaceholder": "አቅራቢ፣ ምርት ወይም የንግድ ምልክት",
  "inputs.compare1": "{n} አቅራቢ አነጻጽር",
  "inputs.compareN": "{n} አቅራቢዎችን አነጻጽር",
  "inputs.tickMore": "ለማነጻጸር ቢያንስ አንድ ተጨማሪ አቅራቢ ይምረጡ።",
  "inputs.tellNeed": "የተሻለ መልስ ለማግኘት የሚፈልጉትን ይንገሩን (አማራጭ)።",
  "inputs.clear": "አጽዳ",
  "inputs.whatNeed": "ምን ይፈልጋሉ?",
  "inputs.needPlaceholder": "ለምሳሌ ለ2 ሄክታር ጤፍ ዳፕ ማዳበሪያ",
  "inputs.compare": "አነጻጽር",
  "inputs.finding": "አቅራቢዎችን በመፈለግ ላይ…",
  "inputs.none": "አቅራቢ አልተገኘም",
  "inputs.noneHint": "ሌላ ክልል ወይም የምርት ዓይነት ይሞክሩ፣ ወይም ፍለጋውን ያጽዱ።",
  "inputs.kmAway": "{n} ኪ.ሜ ርቀት",
  "inputs.stock": "ክምችት፦ {stock}",
  "inputs.showAll": "ሁሉንም {n} ምርቶች አሳይ",

  // ── Financial ──────────────────────────────────────────────────────────
  "fin.meta": "የብድር ውጤትዎ እና የብድር አማራጮች",
  "fin.description": "የማሳዎን የብድር ውጤት እና ሊያመለክቱባቸው የሚችሉ ብድሮችን ይመልከቱ። ውጤቱ በመገለጫዎ ያለውን መረጃ ብቻ ይጠቀማል።",
  "fin.band.strong": "ጠንካራ",
  "fin.band.good": "ጥሩ",
  "fin.band.fair": "መካከለኛ",
  "fin.band.needsWork": "መሻሻል ያስፈልገዋል",
  "fin.tip.farms": "ማሳዎችዎን በመገለጫዬ ውስጥ ይመዝግቡ (+10 ነጥብ)።",
  "fin.tip.region": "ክልልዎን በመገለጫዬ ውስጥ ይምረጡ (+5 ነጥብ)።",
  "fin.tip.zone": "ዞንዎን በመገለጫዬ ውስጥ ይጨምሩ (+3 ነጥብ)።",
  "fin.tip.size": "የእያንዳንዱን ማሳ ስፋት (በሄክታር) ያስገቡ (ከ+3 እስከ +7 ነጥብ)።",
  "fin.tip.resolve": "ቅናሾችን ለማስወገድ የሰብል ችግሮችን ያክሙና የጤና ሪፖርቶችን እንደተፈቱ ምልክት ያድርጉ።",
  "fin.tip.track": "ታሪክ ለመገንባት የሰብል ጤና ምርመራን ይጠቀሙና ይከታተሉ (+5 ነጥብ)።",
  "fin.yourScore": "የእርስዎ የብድር ውጤት",
  "fin.calculating": "ውጤትዎን በማስላት ላይ…",
  "fin.whatAffects": "ውጤትዎን የሚነኩ ነገሮች",
  "fin.helping": "የሚረዱዎት",
  "fin.holdingBack": "ወደኋላ የሚያስቀሩዎት",
  "fin.loans": "ሊያመለክቱባቸው የሚችሉ ብድሮች",
  "fin.loansHint": "ከዝቅተኛ ወለድ ጀምሮ የተደረደሩ። ወርሃዊ ክፍያው ለሙሉ መጠኑ ነው።",
  "fin.findingLoans": "የብድር አማራጮችን በመፈለግ ላይ…",
  "fin.noLoans": "እስካሁን የሚስማማ ብድር የለም",
  "fin.noLoansHint": "ተጨማሪ የብድር አማራጮችን ለማግኘት ውጤትዎን ያሻሽሉ።",
  "fin.notYet": "ገና አይገኙልዎትም",
  "fin.scoreAria": "የብድር ውጤት {score} ከ100",
  "fin.outOf100": "ከ100",
  "fin.raise": "ውጤትዎን እንዴት ማሳደግ ይችላሉ",
  "fin.updateProfile": "መገለጫዬን አዘምን",
  "fin.nothingYet": "እስካሁን ምንም የለም።",
  "fin.nothingWellDone": "ምንም የለም — በጣም ጥሩ።",
  "fin.notForRole": "ለመለያዎ ዓይነት አይቀርብም",
  "fin.needsPoints": "{n} ተጨማሪ ነጥብ ያስፈልጋል",
  "fin.upTo": "እስከ",
  "fin.interest": "ወለድ",
  "fin.perYear": "{rate}% በዓመት",
  "fin.months": "{n} ወራት",
  "fin.monthly": "ወርሃዊ",
  "fin.factor.farm_records": "የተመዘገቡ የማሳ መረጃዎች",
  "fin.factor.farm_records.detail": "{value} ማሳ(ዎች) ተመዝግበዋል",
  "fin.factor.region": "በክልል መመዝገብ",
  "fin.factor.region.detail": "በ{value} የተመዘገበ",
  "fin.factor.zone": "በዞን መመዝገብ",
  "fin.factor.zone.detail": "ዞን፦ {value}",
  "fin.factor.critical_reports": "ያልተፈቱ አሳሳቢ የበሽታ ሪፖርቶች",
  "fin.factor.critical_reports.detail": "{value} አሳሳቢ የጤና ሪፖርት(ቶች) ክፍት ናቸው",
  "fin.factor.moderate_reports": "ንቁ የበሽታ ማስጠንቀቂያዎች",
  "fin.factor.moderate_reports.detail": "{value} መካከለኛ ሪፖርት(ቶች) ክትትል ይጠብቃሉ",
  "fin.factor.track_record": "የቀድሞ ታሪክ",
  "fin.factor.track_record.detail": "{value} የተፈቱ የጤና ሪፖርት(ቶች)",
  "fin.factor.farm_scale": "የማሳ ስፋት",
  "fin.factor.farm_scale.detail": "{value} ሄክታር የተመዘገበ የእርሻ መሬት",
  "fin.factor.smallholder": "አነስተኛ ማሳ",
  "fin.factor.smallholder.detail": "{value} ሄክታር ተመዝግቧል",

  // ── My profile ─────────────────────────────────────────────────────────
  "profile.meta": "መለያዎ እና ማሳዎችዎ",
  "profile.description": "ዋጋዎችና ምክሮች ከአካባቢዎ ጋር እንዲጣጣሙ መረጃዎን ወቅታዊ ያድርጉ።",
  "profile.nameEmpty": "ስም ባዶ መሆን አይችልም።",
  "profile.saved": "መገለጫዎ ተቀምጧል።",
  "profile.personal": "የግል መረጃ",
  "profile.phoneHint": "ስልክ ቁጥርዎ የመግቢያ መለያዎ ስለሆነ መቀየር አይቻልም።",
  "profile.regionLocked": "በዚህ ክልል ያሉ አርሶ አደሮችን ይደግፋሉ። ለመቀየር አስተዳዳሪን ይጠይቁ።",
  "profile.legacyAddress": "የተቀመጠ አድራሻ፦ {address}። የአየር ሁኔታና ማስጠንቀቂያዎች ትክክለኛውን ቦታ እንዲጠቀሙ ከዝርዝሩ ይምረጡት።",
  "profile.farmsHint": "የሚያርሱባቸው ማሳዎች። ለሰብል ጤና ምርመራ እና ለብድር ውጤትዎ ጥቅም ላይ ይውላሉ።",
  "profile.addFarm": "ማሳ ጨምር",
  "profile.firstField": "ለመጀመር የመጀመሪያ ማሳዎን ይመዝግቡ።",
  "profile.area": "ስፋት",
  "profile.planted": "የተዘራበት",
  "profile.deleteTitle": "ይህ ማሳ ይሰረዝ?",
  "profile.deleteMessage": "\"{name}\" እና ዝርዝሮቹ ይሰረዛሉ። ይህንን መመለስ አይቻልም።",
  "profile.fieldRequired": "የማሳ ስም እና ሰብል ያስፈልጋሉ።",
  "profile.areaPositive": "ስፋቱ ከዜሮ በላይ የሆነ የሄክታር ቁጥር መሆን አለበት።",
  "profile.editFarm": "ማሳ አስተካክል",
  "profile.oneField": "ስለሚያርሱበት አንድ ማሳ ይንገሩን።",
  "profile.fieldName": "የማሳ ስም",
  "profile.fieldNamePlaceholder": "ለምሳሌ የሰሜን ማሳ",
  "profile.cropPlaceholder": "ለምሳሌ ጤፍ",
  "profile.areaHa": "ስፋት (ሄክታር)",
  "profile.plantingDate": "የዘር ቀን",
  "profile.condition": "ሁኔታ",
  "profile.notes": "ማስታወሻ",
  "profile.notesPlaceholder": "ስለዚህ ማሳ ማስታወስ የሚገባ ነገር",

  // ── Users (admin) ──────────────────────────────────────────────────────
  "users.meta": "የመድረኩን ተጠቃሚዎች ያስተዳድሩ",
  "users.description": "የAgri-Stack 360 መለያ ያላቸው ሁሉም። ተጠቃሚን ለማስተካከል ወይም የይለፍ ቃሉን ለመቀየር ተግባራትን ይጠቀሙ።",
  "users.total": "ጠቅላላ ተጠቃሚዎች",
  "users.farms": "የተመዘገቡ ማሳዎች",
  "users.openReports": "ክፍት የጤና ሪፖርቶች",
  "users.resolvedReports": "የተፈቱ የጤና ሪፖርቶች",
  "users.all": "ሁሉም ተጠቃሚዎች",
  "users.search": "ስም፣ ስልክ ወይም ክልል ይፈልጉ",
  "users.filterRole": "በሚና አጣራ",
  "users.allRoles": "ሁሉም ሚናዎች",
  "users.noMatch": "የሚስማማ ተጠቃሚ የለም",
  "users.noMatchHint": "ፍለጋውን ወይም የሚና ማጣሪያውን ያጽዱ።",
  "users.farmsCol": "ማሳዎች",
  "users.joined": "የተቀላቀለበት",
  "users.agentRegionHint": "የልማት ጣቢያ ሰራተኞች የሚያዩት በክልላቸው ያሉ ማሳዎችን ብቻ ነው",
  "users.regionFor": "የ{name} ክልል",
  "users.noRegion": "ክልል የለም",
  "users.savedNotice": "የ{name} መረጃ ተቀምጧል።",
  "users.passwordNotice": "ለ{name} አዲስ የይለፍ ቃል ተዘጋጅቷል። በአካል ወይም በስልክ ይስጧቸው።",
  "users.reactivateQ": "{name} እንደገና ይንቃ?",
  "users.deactivateQ": "{name} ይታገድ?",
  "users.deactivateBody": "ከመለያው ይወጣሉ፤ መለያው እንደገና እስኪከፈት ድረስ መግባት አይችሉም።",
  "users.reactivateBody": "እንደገና መግባት ይችላሉ።",
  "users.deactivate": "አግድ",
  "users.reactivate": "እንደገና አንቃ",
  "users.actionsFor": "ለ{name} ተግባራት",
  "users.editUser": "ተጠቃሚውን አስተካክል",
  "users.resetPassword": "የይለፍ ቃል ቀይር",
  "users.agentNeedsRegion": "የልማት ጣቢያ ሰራተኞች ክልል ያስፈልጋቸዋል — የሚያዩት በክልላቸው ያሉ ማሳዎችን ብቻ ነው።",
  "users.joinedOn": "የተቀላቀለው {date}",
  "users.lastSignIn": "ለመጨረሻ ጊዜ የገባው {date}",
  "users.neverSignedIn": "እስካሁን አልገባም",
  "users.phoneHint": "ስልክ ቁጥሩ የመግቢያ መለያቸው ስለሆነ መቀየር አይቻልም።",
  "users.ownRole": "የራስዎን ሚና መቀየር አይችሉም።",
  "users.legacyAddress": "የተቀመጠ አድራሻ፦ {address}። ኦፊሴላዊውን የአካባቢ ኮድ ለማስቀመጥ ከዝርዝሩ ይምረጡት።",
  "users.accountActive": "መለያው ንቁ ነው",
  "users.accountOff": "መለያው ታግዷል",
  "users.changingRole": "ሚናውን ወደ {role} መቀየር",
  "users.takesEffect": "ለውጡ እንዳስቀመጡ ወዲያውኑ ይተገበራል።",
  "users.gains": "የሚያገኘው፦ {list}።",
  "users.loses": "የሚያጣው፦ {list}።",
  "users.deactivateWarn": "ማስቀመጥ ከመለያው ያስወጣቸዋል። መለያው እንደገና እስኪከፈት ድረስ መግባት አይችሉም።",
  "users.setNewFor": "ለ{name} ({phone}) አዲስ የይለፍ ቃል ያዘጋጁ።",
  "users.newPassword": "አዲስ የይለፍ ቃል",
  "users.generate": "በራስ-ሰር ፍጠር",
  "users.giveInPerson": "አዲሱን የይለፍ ቃል በአካል ወይም በስልክ ይስጧቸው። የቀድሞው የይለፍ ቃላቸው ወዲያውኑ መስራት ያቆማል።",
  "users.setPassword": "አዲስ የይለፍ ቃል አስቀምጥ",

  // ── Permissions and role descriptions ──────────────────────────────────
  "permArea.market": "ገበያ እና ምክር",
  "permArea.farms": "ማሳዎች እና የሰብል ጤና",
  "permArea.inputs": "ግብዓቶች እና ፋይናንስ",
  "perm.market_read": "የገበያ ዋጋዎችንና ትንበያዎችን ማየት",
  "perm.market_read.desc": "ሳምንታዊ ዋጋዎች፣ የክልሎች ንጽጽር፣ የገበያ ሰንጠረዥ እና የዋጋ ትንበያዎች።",
  "perm.advisory_use": "የAI አማካሪውን መጠቀም",
  "perm.advisory_use.desc": "ስለ ዋጋ፣ ሽያጭ እና እርሻ የAI አማካሪውን መጠየቅ።",
  "perm.profile_manage": "የራስን መገለጫ ማስተካከል",
  "perm.profile_manage.desc": "የራስን ስም፣ ዞን፣ ወረዳ እና ቋንቋ መቀየር።",
  "perm.farms_manage_own": "የራስን ማሳዎች መመዝገብና ማስተካከል",
  "perm.farms_manage_own.desc": "የራሳቸውን ማሳዎች መፍጠር፣ ማስተካከል እና መሰረዝ።",
  "perm.farms_read_region": "በራስ ክልል ያሉ ማሳዎችን ማየት",
  "perm.farms_read_region.desc": "ባለቤታቸው በዚያው ክልል የሆኑ ማሳዎችን ሁሉ ማየት። ክልላቸው በአስተዳዳሪ ይመደባል።",
  "perm.farms_manage_all": "ሁሉንም ማሳዎች ማየትና ማስተካከል",
  "perm.farms_manage_all.desc": "በመድረኩ ላይ ያለ ማንኛውንም ማሳ ማየትና መቀየር።",
  "perm.crop_health_use": "የሰብል ጤና ምርመራ ማድረግ",
  "perm.crop_health_use.desc": "በሚያዩዋቸው ማሳዎች ላይ ችግሮችን መመርመር፣ የጤና ሪፖርቶችን ማስቀመጥና እንደተፈቱ ምልክት ማድረግ።",
  "perm.inputs_read": "የግብዓት አቅራቢዎችን መመልከት",
  "perm.inputs_read.desc": "የዘር፣ የማዳበሪያ እና የኬሚካል አቅራቢዎችን ማግኘትና በAI ማነጻጸር።",
  "perm.financial_read": "የብድር ውጤትና ብድሮችን ማየት",
  "perm.financial_read.desc": "የማሳቸውን የብድር ውጤትና የሚስማሙ የብድር ምርቶችን ማየት።",
  "perm.users_manage": "ተጠቃሚዎችንና ሚናዎችን ማስተዳደር",
  "perm.users_manage.desc": "ተጠቃሚዎችን መዘርዘር፣ ሚናና ክልል መቀየር፣ መለያዎችን ማንቃት ወይም ማገድ።",
  "perm.platform_stats": "የመድረኩን ስታቲስቲክስ ማየት",
  "perm.platform_stats.desc": "የተጠቃሚዎችን፣ የማሳዎችንና የጤና ሪፖርቶችን ድምር ማየት።",
  "perm.sync_manage": "የመረጃ ማመሳሰል ማካሄድ",
  "perm.sync_manage.desc": "ከnmis.et አዲስ ዋጋዎችን ማውረድ፣ የዕለት መርሃ ግብር ማዘጋጀትና የማመሳሰል ታሪክ ማየት።",
  "perm.models_retrain": "የትንበያ ሞዴሎችን እንደገና ማሰልጠን",
  "perm.models_retrain.desc": "የዋጋ ትንበያ ሞዴሎችን እንደገና ማሰልጠን መጀመር።",
  "perm.knowledge_manage": "የምክር የእውቀት ማዕከሉን ማስተዳደር",
  "perm.knowledge_manage.desc": "የAI አማካሪው የሚጠቀምባቸውን የመመሪያ ሰነዶች መጫን፣ መመደብ፣ ማኅደር ማስገባትና እንደገና መጠቆም።",
  "perm.advisory_admin": "የAI ምክሩን ማስተዳደር",
  "perm.advisory_admin.desc": "የምክር ገደቦችን መቀየር፣ የማስጠንቀቂያ ሥርዓቱን ማስኬድና የተላለፉ ጉዳዮችን መገምገም።",
  "role.farmer.desc": "ሰብል ያመርታል። የራሱን ማሳዎች ያስተዳድራል፣ የሰብል ጤናን ይመረምራል፣ የግብዓት አቅራቢዎችን ያነጻጽራል እና የብድር አማራጮችን ያያል።",
  "role.agent.desc": "በራሱ ክልል ያሉ አርሶ አደሮችን ይደግፋል፦ ማሳዎቻቸውን ያያል እና የሰብል ጤና ምርመራ ያደርግላቸዋል።",
  "role.trader.desc": "ምርት ይገዛል ይሸጣል። የገበያ ዋጋዎችን ይከታተላል፣ የግብዓት አቅራቢዎችን ያነጻጽራል እና የብድር አማራጮችን ያያል።",
  "role.admin.desc": "መድረኩን ያስተዳድራል። ተጠቃሚዎችን፣ ሚናዎችንና የመረጃ ማመሳሰልን ጨምሮ ሁሉም ፈቃድ አለው።",

  // ── Roles and permissions pages ────────────────────────────────────────
  "roles.meta": "እያንዳንዱ ሚና ለምን እንደሆነ እና ምን ማድረግ እንደሚችል",
  "roles.description": "እያንዳንዱ መለያ አንድ ሚና አለው። ሚናው አንድ ሰው የትኞቹን ገጾች እንደሚያይ እና ምን እንዲያደርግ እንደተፈቀደለት ይወስናል።",
  "roles.loading": "ሚናዎችን በመጫን ላይ…",
  "roles.howGiven": "ሚናዎች እንዴት ይሰጣሉ",
  "roles.howGivenBody": "አርሶ አደሮችና ነጋዴዎች ሲመዘገቡ ሚናቸውን ይመርጣሉ። የልማት ጣቢያ ሰራተኞችና አስተዳዳሪዎች የሌሎችን መረጃ ማየት ስለሚችሉ እነዚህን ሚናዎች መስጠት የሚችለው አስተዳዳሪ ብቻ ነው፤ በተጠቃሚዎች ገጽ ላይ።",
  "roles.openUsers": "ተጠቃሚዎችን ክፈት",
  "roles.openSignup": "ክፍት ምዝገባ",
  "roles.byAdmin": "በአስተዳዳሪ የሚሰጥ",
  "roles.people": "ይህ ሚና ያላቸው ሰዎች",
  "roles.activeCount": "{n} ንቁ",
  "roles.areas": "{n} ዘርፎች",
  "roles.viewUsers": "ተጠቃሚዎችን ይመልከቱ፦ {role}",
  "roles.compareAll": "ሁሉንም ፈቃዶች አነጻጽር",
  "perms.meta": "እያንዳንዱ ፈቃድ እና ያላቸው ሚናዎች",
  "perms.description": "አንድ ሰው እንዲያደርግ ሊፈቀድለት የሚችለው ሁሉ እና የሚፈቅዱት ሚናዎች። ሰርቨሩ እነዚህን በእያንዳንዱ ጥያቄ ያረጋግጣል።",
  "perms.search": "ፈቃዶችን ይፈልጉ",
  "perms.loading": "ፈቃዶችን በመጫን ላይ…",
  "perms.noMatch": "የሚስማማ ፈቃድ የለም",
  "perms.noMatchHint": "ሌላ ቃል ይሞክሩ።",
  "perms.footer": "አንድ ሰው የሚችለውን ለመቀየር በተጠቃሚዎች ገጽ ላይ ሚናውን ይቀይሩ። ፈቃዶቹ የተገለጹት በ",
  "perms.count1": "{n} ፈቃድ",
  "perms.countN": "{n} ፈቃዶች",
  "perms.permission": "ፈቃድ",
  "perms.allowed": "{role}፦ ተፈቅዷል",
  "perms.notAllowed": "{role}፦ አልተፈቀደም",

  // ── Knowledge base (admin) ─────────────────────────────────────────────
  "kb.meta": "አማካሪው የሚመልስባቸው የመመሪያ ሰነዶች",
  "kb.description": "የAI አማካሪው የሚመልስባቸው የግብርና ሚኒስቴር መመሪያዎች። ማኅደር የገቡ ሰነዶች ከዚህ በኋላ ጥቅም ላይ አይውሉም።",
  "kb.detect": "በራስ-ሰር ለይ",
  "kb.mixed": "ቅይጥ",
  "kb.embeddedPartial": "{n} ክፍሎች ተጠቁመዋል፤ {left} ገና ይጠብቃሉ።",
  "kb.embedded": "{n} ክፍሎች ተጠቁመዋል።",
  "kb.allEmbedded": "ሁሉም ክፍሎች ቀድሞውኑ ተጠቁመዋል።",
  "kb.reindex": "እንደገና ጠቁም",
  "kb.uploadPdf": "PDF ጫን",
  "kb.activeDocs": "ንቁ ሰነዶች",
  "kb.passages": "ክፍሎች",
  "kb.readyMeaning": "ለትርጉም ፍለጋ ዝግጁ",
  "kb.documents": "ሰነዶች",
  "kb.noDocs": "እስካሁን ሰነድ የለም",
  "kb.noDocsHint": "የግብርና ሚኒስቴር የምርት ፓኬጆችንና መመሪያዎችን በPDF ይጫኑ።",
  "kb.title": "ርዕስ",
  "kb.crops": "ሰብሎች",
  "kb.pages": "ገጾች",
  "kb.added": "የተጨመረበት",
  "kb.embeddedOf": "{n}/{total} ተጠቁመዋል",
  "kb.inUse": "በጥቅም ላይ",
  "kb.archived": "ማኅደር የገባ",
  "kb.archive": "ወደ ማኅደር አስገባ",
  "kb.restore": "መልስ",
  "kb.addedNotice": "\"{title}\" ተጨምሯል፦ {pages} ገጾች፣ {chunks} ክፍሎች።",
  "kb.ocrSkipped": "ገጾች {pages} ጽሑፍ የላቸውም (የተቃኙ ናቸው) ስለዚህ ተዘለዋል።",
  "kb.test": "ጥያቄ ይሞክሩ",
  "kb.testHint": "አማካሪው ከመመለሱ በፊት የትኞቹን ክፍሎች እንደሚያነብ ይመልከቱ።",
  "kb.testPlaceholder": "ለምሳሌ ዩሪያ መቼ ይጨመራል?",
  "kb.noPassages": "ምንም ክፍል አልተገኘም።",
  "kb.wordRank": "ቃል #{n}",
  "kb.meaningRank": "ትርጉም #{n}",
  "kb.choosePdf": "የPDF ፋይል ይምረጡ።",
  "kb.pdfOnly": "PDF ይጫኑ። የገጽ ቁጥሮች እንዲጠቀሱ የWord ሰነዶችን መጀመሪያ በPDF ያስቀምጡ።",
  "kb.titleCropsRequired": "ርዕስ እና ሰብሎች ያስፈልጋሉ።",
  "kb.uploadTitle": "መመሪያ ይጫኑ",
  "kb.uploadHint": "PDFው በክፍሎች ተከፍሎ ይጠቆማል። ትላልቅ መመሪያዎች አንድ ደቂቃ ይወስዳሉ።",
  "kb.pdfFile": "የPDF ፋይል",
  "kb.version": "እትም",
  "kb.sourceLink": "የምንጭ ማገናኛ (አማራጭ)",
  "kb.upload": "ጫን",

  // ── Data sync (admin) ──────────────────────────────────────────────────
  "sync.meta": "የገበያ ዋጋዎችን ወቅታዊ ያድርጉ",
  "sync.description": "የቅርብ ጊዜ ዋጋዎችን ከnmis.et ያውርዱ እና ትንበያዎቹን ወቅታዊ ያድርጉ።",
  "sync.status.running": "በሂደት ላይ",
  "sync.status.success": "ተጠናቋል",
  "sync.status.partial": "በክፍተቶች ተጠናቋል",
  "sync.status.failed": "አልተሳካም",
  "sync.status.cancelled": "ቆሟል",
  "sync.status.interrupted": "ተቋርጧል",
  "sync.retrain.running": "በማዘመን ላይ",
  "sync.retrain.success": "ተዘምኗል",
  "sync.retrain.skipped": "አላስፈለገም",
  "sync.phase.starting": "በመጀመር ላይ",
  "sync.phase.catalog": "አዳዲስ ገበያዎችን በማጣራት ላይ",
  "sync.phase.prices": "ዋጋዎችን በማውረድ ላይ",
  "sync.phase.export": "የCSV ፋይል በመጻፍ ላይ",
  "sync.phase.retrain": "የዋጋ ትንበያዎችን በማዘመን ላይ",
  "sync.full": "ሙሉ",
  "sync.quick": "ፈጣን",
  "sync.unreachable": "የመረጃ ማመሳሰያ አገልግሎቱን ማግኘት አልተቻለም",
  "sync.livePaused": "የቀጥታ ሁኔታ ቆሟል፦ {error}",
  "sync.latestDate": "የቅርብ ጊዜ የዋጋ ቀን",
  "sync.dayAgo": "ከ{n} ቀን በፊት",
  "sync.daysAgo": "ከ{n} ቀናት በፊት",
  "sync.priceRecords": "የዋጋ መዝገቦች",
  "sync.since": "ከ{date} ጀምሮ",
  "sync.marketsCrops": "ገበያዎች · ሰብሎች",
  "sync.varieties": "{n} ዝርያዎች",
  "sync.forecastData": "ትንበያዎች የሚጠቀሙት መረጃ እስከ",
  "sync.retrained": "እንደገና የሰለጠነው {date}",
  "sync.runStopped": "ሂደት #{id} ቆሟል",
  "sync.runInterrupted": "ሂደት #{id} ተቋርጧል",
  "sync.resumeHint": "ከ{total} ጥምሮች {done} ወርደዋል። ቀሪውን ለማውረድ ይቀጥሉ።",
  "sync.resume": "ቀጥል",
  "sync.history": "የማመሳሰል ታሪክ",
  "sync.historyHint": "ዝርዝሩንና መዝገቡን ለማየት አንድ ሂደት ይጫኑ።",
  "sync.noRuns": "እስካሁን ማመሳሰል አልተደረገም",
  "sync.noRunsHint": "የመጀመሪያውን ማመሳሰል ከላይ ይጀምሩ።",
  "sync.col.run": "ሂደት",
  "sync.col.started": "የተጀመረበት",
  "sync.col.type": "ዓይነት",
  "sync.col.pairs": "ጥምሮች",
  "sync.col.duration": "የፈጀው ጊዜ",
  "sync.newPrices": "አዳዲስ ዋጋዎች",
  "sync.forecasts": "ትንበያዎች",
  "sync.running": "ማመሳሰል #{id} በሂደት ላይ — {scope} ማመሳሰል",
  "sync.stopping": "በማቆም ላይ…",
  "sync.stop": "ማመሳሰሉን አቁም",
  "sync.eta": "{time} ገደማ ቀርቷል",
  "sync.startedAt": "የተጀመረው {date}",
  "sync.stopQ": "ይህ ማመሳሰል ይቁም?",
  "sync.stopBody": "አሁን ያለው ጥያቄ መጀመሪያ ይጠናቀቃል። እስካሁን የወረደው ሁሉ ይቀመጣል፣ በኋላም መቀጠል ይችላሉ።",
  "sync.quickTitle": "ፈጣን ማመሳሰል",
  "sync.quickText": "ባለፉት 90 ቀናት ሪፖርት ያደረጉ ገበያዎች",
  "sync.fullTitle": "ሙሉ ማመሳሰል",
  "sync.fullText": "የሚታወቁ ሁሉም ገበያዎች",
  "sync.pairsN": "{n} ጥምሮች",
  "sync.now": "አሁን አመሳስል",
  "sync.nowHint": "ከበስተጀርባ ይሰራል — ይህንን ገጽ መልቀቅ ይችላሉ።",
  "sync.type": "የማመሳሰል ዓይነት",
  "sync.optRetrain": "ከዚያ በኋላ የዋጋ ትንበያዎችን አዘምን (1–2 ደቂቃ)",
  "sync.optCatalog": "የእያንዳንዱን ገበያ የሰብል ዝርዝር እንደገና አጣራ (~15 ደቂቃ ተጨማሪ)",
  "sync.optExport": "የCSV ፋይሉን እንደገና ጻፍ",
  "sync.start": "{scope} ማመሳሰል ጀምር",
  "sync.scheduleSaved": "መርሃ ግብሩ ተቀምጧል።",
  "sync.auto": "ራስ-ሰር ዕለታዊ ማመሳሰል",
  "sync.next": "ቀጣይ፦ {scope} ማመሳሰል በ{date}",
  "sync.autoOff": "ጠፍቷል — ዋጋዎች የሚታደሱት በእጅ ሲያመሳስሉ ብቻ ነው።",
  "sync.on": "በርቷል",
  "sync.off": "ጠፍቷል",
  "sync.time": "ሰዓት (የሰርቨር ሰዓት)",
  "sync.fullOn": "ሙሉ ማመሳሰል የሚደረግበት ቀን",
  "sync.never": "በፍጹም (ፈጣን ማመሳሰል ብቻ)",
  "sync.optRetrainEach": "ከእያንዳንዱ ማመሳሰል በኋላ የዋጋ ትንበያዎችን አዘምን",
  "sync.optCatalogFull": "በሙሉ ማመሳሰል ጊዜ የሰብል ዝርዝሮችን እንደገና አጣራ",
  "sync.showAdvanced": "የላቁ አማራጮችን አሳይ",
  "sync.hideAdvanced": "የላቁ አማራጮችን ደብቅ",
  "sync.rate": "በጥያቄዎች መካከል ያሉ ሰከንዶች",
  "sync.rateHint": "ዝቅ ያለው ፈጣን ነው ግን በnmis.et ላይ ተጨማሪ ጫና ያሳድራል። ነባሪው 1.0 ነው።",
  "sync.undo": "ቀልብስ",
  "sync.saveSchedule": "መርሃ ግብሩን አስቀምጥ",
  "sync.scheduled": "በመርሃ ግብር",
  "sync.manual": "በእጅ",
  "sync.resumes": "#{id}ን ይቀጥላል",
  "sync.runTitle": "የማመሳሰል ሂደት #{id}",
  "sync.startedBy": "የጀመረው {name}",
  "sync.finished": "የተጠናቀቀበት",
  "sync.pairsFetched": "የወረዱ ጥምሮች",
  "sync.latestBefore": "ከዚህ በፊት የነበረው የቅርብ ቀን",
  "sync.latestAfter": "ከዚህ በኋላ ያለው የቅርብ ቀን",
  "sync.fetchTime": "የማውረድ ጊዜ",
  "sync.notRequested": "አልተጠየቀም",
  "sync.error": "ስህተት",
  "sync.forecastUpdate": "የትንበያ ማዘመን",
  "sync.failedPairs": "ያልተሳኩ ጥምሮች ({n}) — በሚቀጥለው ማመሳሰል እንደገና ይሞከራሉ",
  "sync.log": "መዝገብ (የመጨረሻዎቹ 300 መስመሮች)",
  "sync.noLog": "ምንም የመዝገብ መስመር የለም።",
  "error.requestFailed": "ጥያቄው አልተሳካም ({status})",

  // ── AI API keys (admin) ────────────────────────────────────────────────
  "nav.aiKeys": "የAI ቁልፎች",
  "aikeys.meta": "መድረኩ በዙር የሚጠቀምባቸው የGemini API ቁልፎች",
  "aikeys.description": "የGemini እና የDeepSeek API ቁልፎችን ይጨምሩና መልሶቹን የትኛው AI እንደሚጽፍ ይምረጡ። አንድ ቁልፍ ገደቡ ወይም ሂሳቡ ሲያልቅ ወይም ውድቅ ሲሆን፣ መድረኩ በራሱ ወደ ቀጣዩ ቁልፍ ይቀይራል።",  // draft – needs native review
  "aikeys.add": "ቁልፍ ጨምር",
  "aikeys.usableNow": "አሁን የሚሰሩ ቁልፎች",
  "aikeys.nextFree": "ቀጣዩ ቁልፍ የሚለቀቅበት",
  "aikeys.model": "የAI ሞዴል",
  "aikeys.noneUsable": "አሁን የሚሰራ የAI ቁልፍ የለም",
  "aikeys.noneUsableHint": "ሁሉም ቁልፎች ኮታቸው አልቋል፣ እያረፉ ነው ወይም ውድቅ ተደርገዋል። አንድ ቁልፍ እስኪለቀቅ ወይም አዲስ እስኪጨምሩ ድረስ አማካሪው የሚመልሰው የተቀዱ ጥያቄዎችን ብቻ ነው።",
  "aikeys.keys": "ቁልፎች",
  "aikeys.keysHint": "ከላይ ወደ ታች ይሞከራሉ። ቅደም ተከተሉን ለመቀየር ቀስቶቹን ይጠቀሙ።",
  "aikeys.none": "እስካሁን ቁልፍ አልተጨመረም",
  "aikeys.noneHint": "አንድ እስኪጨምሩ ድረስ መድረኩ በሰርቨሩ .env ፋይል ያለውን GEMINI_API_KEY ይጠቀማል።",
  "aikeys.order": "ቅደም ተከተል",
  "aikeys.label": "ስም",
  "aikeys.usesToday": "የዛሬ ጥያቄዎች",
  "aikeys.lastUsed": "ለመጨረሻ ጊዜ የተጠቀመበት",
  "aikeys.enabled": "በጥቅም ላይ",
  "aikeys.moveUp": "ወደ ላይ አንቀሳቅስ",
  "aikeys.moveDown": "ወደ ታች አንቀሳቅስ",
  "aikeys.test": "ሞክር",
  "aikeys.reset": "ዳግም አስጀምር",
  "aikeys.status.unknown": "ገና ጥቅም ላይ አልዋለም",
  "aikeys.status.ok": "እየሰራ ነው",
  "aikeys.status.quota": "ኮታው አልቋል",
  "aikeys.status.rateLimited": "የፍጥነት ገደብ",
  "aikeys.status.invalid": "ውድቅ ተደርጓል",
  "aikeys.status.error": "ስህተት",
  "aikeys.status.disabled": "ጠፍቷል",
  "aikeys.until": "እስከ {date}",
  "aikeys.testOk": "\"{label}\" እየሰራ ነው።",
  "aikeys.testFailed": "\"{label}\" አልሰራም፦ {message}",
  "aikeys.resetDone": "\"{label}\" እንደገና ይሞከራል።",
  "aikeys.envTitle": "ከሰርቨሩ የሚገኝ ተጠባባቂ ቁልፍ",
  "aikeys.envHint": "በ.env ፋይል ያለው GEMINI_API_KEY ከላይ ካሉት ቁልፎች ሁሉ በኋላ ይሞከራል።",
  "aikeys.howTitle": "መቀያየሩ እንዴት ይሰራል",
  "aikeys.howBody": "የዕለት ኮታ ካለቀ፦ ቁልፉ Gemini እስከሚያድስበት ጊዜ ያርፋል። የደቂቃ ገደብ ካጋጠመ፦ Gemini ለሚጠይቃቸው ሰከንዶች ያርፋል። ውድቅ የተደረገ ቁልፍ፦ እስኪሞክሩት ወይም ዳግም እስኪያስጀምሩት ድረስ ይዘለላል። ቁልፍ መሞከር ከኮታው አንድ ጥያቄ ይጠቀማል።",
  "aikeys.added": "\"{label}\" ተጨምሯል።",
  "aikeys.deleteQ": "ይህ ቁልፍ ይሰረዝ?",
  "aikeys.deleteBody": "\"{label}\" (•••• {last4}) ከመድረኩ ይሰረዛል።",
  "aikeys.deleted": "\"{label}\" ተሰርዟል።",
  "aikeys.addTitle": "የGemini API ቁልፍ ይጨምሩ",
  "aikeys.addHint": "አቅራቢውን ይምረጡ፣ ከዚያ ቁልፉን ይለጥፉ።",  // draft – needs native review
  "aikeys.labelPlaceholder": "ለምሳሌ ፕሮጀክት 2 (ነጻ)",
  "aikeys.apiKey": "API ቁልፍ",
  "aikeys.storedEncrypted": "ቁልፉ ተመስጥሮ ይቀመጣል እና ዳግም አይታይም፤ የሚታዩት የመጨረሻዎቹ 4 ፊደላት ብቻ ናቸው።",
  "aikeys.addInvalid": "ስም እና ሙሉውን የAPI ቁልፍ ያስገቡ።",

  // ── Text-to-speech ─────────────────────────────────────────────────────
  "tts.listen": "ያዳምጡ",
  "tts.stop": "አቁም",
  "tts.loading": "ድምፁን በማዘጋጀት ላይ…",
  "tts.failed": "ድምፅ አይገኝም",

  // ── Consent & my data ─────────────────────────────────────────────────────
  "consent.title": "የእኔ መረጃ እና ፈቃድ",  // draft – needs native review
  "consent.description": "መረጃዎን ማን ማየት እንደሚችል እርስዎ ይወስናሉ። በማንኛውም ጊዜ መቀየር ይችላሉ።",  // draft – needs native review
  "consent.data": "የግብርና ባለሙያዎች እርሻዬን፣ የሰብል ምርመራዎቼን እና ጥያቄዎቼን እንዲያዩ ፍቀድ",  // draft – needs native review
  "consent.dataHint": "የልማት ሰራተኛዎ (DA) እርስዎን ለመርዳትና ሰብልዎ ችግር ሲገጥመው ለመጎብኘት ይጠቀምበታል።",  // draft – needs native review
  "consent.alerts": "ማስጠንቀቂያዎችንና አስታዋሾችን ላክልኝ",  // draft – needs native review
  "consent.alertsHint": "በእርሻዬ አቅራቢያ ያሉ የበሽታ ማስጠንቀቂያዎች እና የ7 ቀን ክትትል ጥያቄዎች።",  // draft – needs native review
  "consent.legalDraft": "ረቂቅ ጽሑፍ፣ የሕግ ግምገማ በመጠባበቅ ላይ (የግል መረጃ ጥበቃ አዋጅ 1321/2024)።",  // draft – needs native review
  "consent.history": "የለውጥ ታሪክ",  // draft – needs native review
  "consent.noHistory": "እስካሁን ምንም ለውጥ የለም።",  // draft – needs native review
  "consent.granted": "በርቷል",  // draft – needs native review
  "consent.withdrawn": "ጠፍቷል",  // draft – needs native review
  "consent.kind.data": "ለባለሙያዎች ማጋራት",  // draft – needs native review
  "consent.kind.alerts": "ማስጠንቀቂያዎች",  // draft – needs native review
  "consent.byOther": "በ{name} የተመዘገበ",  // draft – needs native review
  "consent.download": "መረጃዬን አውርድ",  // draft – needs native review
  "consent.downloadHint": "መድረኩ ስለእርስዎ የያዘውን ሁሉ የያዘ ፋይል።",  // draft – needs native review
  "consent.saved": "ተቀምጧል።",  // draft – needs native review
  "signup.consentData": "የግብርና ባለሙያዎች የእርሻ መረጃዬን እንዲያዩ ፍቀድ (አማራጭ)",  // draft – needs native review
  "signup.consentAlerts": "የበሽታ ማስጠንቀቂያዎችንና አስታዋሾችን ላክልኝ (አማራጭ)",  // draft – needs native review
  "signup.consentNote": "እነዚህን በማንኛውም ጊዜ በመገለጫዎ ውስጥ መቀየር ይችላሉ።",  // draft – needs native review

  // ── DA Copilot ────────────────────────────────────────────────────────────
  "nav.daCopilot": "የDA ረዳት",  // draft – needs native review
  "nav.daInbox": "የተላለፉ ጉዳዮች",  // draft – needs native review
  "perm.da_work": "እንደ ልማት ሰራተኛ መስራት",  // draft – needs native review
  "perm.da_work.desc": "አርሶ አደሮቼን እና የጉብኝት ዝርዝሬን ማየት፣ የተላለፉ ጥያቄዎችን መመለስ፣ ምርመራዎችን ማረጋገጥ እና አርሶ አደሮችን መመዝገብ።",  // draft – needs native review
  "da.meta": "አርሶ አደሮችዎ እና መጀመሪያ መጎብኘት ያለብዎት።",  // draft – needs native review
  "da.description": "መረጃቸውን ለማጋራት የተስማሙ አርሶ አደሮችዎ እና መጀመሪያ ጉብኝት የሚያስፈልገው።",  // draft – needs native review
  "da.visits": "መጀመሪያ ይጎብኙ",  // draft – needs native review
  "da.visitsHint": "በአስፈላጊነት የተደረደረ፦ መጀመሪያ የባሰባቸው ሰብሎች፣ ከዚያ እርግጠኛ ያልሆኑ የፎቶ ምርመራዎች፣ ያመለጡ ክትትሎች፣ በአቅራቢያ ያሉ ወረርሽኞች እና ያልተመለሱ ጥያቄዎች።",  // draft – needs native review
  "da.noVisits": "አሁን ጉብኝት የሚያስፈልገው የለም።",  // draft – needs native review
  "da.points": "{n} ነጥብ",  // draft – needs native review
  "da.waitingSince": "ከ{date} ጀምሮ በመጠባበቅ ላይ",  // draft – needs native review
  "da.reason.worse": "ከምክሩ በኋላ ሰብሉ ባሰበት",  // draft – needs native review
  "da.reason.uncertain_diagnosis": "የፎቶ ምርመራው እርግጠኛ አይደለም፣ የእርስዎን ማረጋገጫ ይፈልጋል",  // draft – needs native review
  "da.reason.overdue_follow_up": "የ7 ቀን ክትትል አምልጧል",  // draft – needs native review
  "da.reason.outbreak_nearby": "በአቅራቢያ የበሽታ ወረርሽኝ",  // draft – needs native review
  "da.reason.open_question": "መልስ የሚጠብቅ ጥያቄ",  // draft – needs native review
  "da.farmers": "አርሶ አደሮቼ",  // draft – needs native review
  "da.farmersHint": "የሚታዩት መረጃቸውን ከባለሙያዎች ጋር ለማጋራት የተስማሙ አርሶ አደሮች ብቻ ናቸው።",  // draft – needs native review
  "da.noFarmers": "እስካሁን አርሶ አደር የለም። አርሶ አደር ይመዝግቡ፣ ወይም አስተዳዳሪ አርሶ አደሮችን እንዲመድብልዎ ይጠይቁ።",  // draft – needs native review
  "da.col.farmer": "አርሶ አደር",  // draft – needs native review
  "da.col.crop": "ሰብል እና ደረጃ",  // draft – needs native review
  "da.col.lastCheck": "የመጨረሻ የፎቶ ምርመራ",  // draft – needs native review
  "da.col.open": "ክፍት ጉዳዮች",  // draft – needs native review
  "da.assignedToMe": "ለእኔ የተመደበ",  // draft – needs native review
  "da.day": "ቀን {n}",  // draft – needs native review
  "da.noCrop": "ንቁ የሰብል ወቅት የለም",  // draft – needs native review
  "da.noCheck": "እስካሁን የለም",  // draft – needs native review
  "da.openCount": "{n} ክፍት",  // draft – needs native review
  "da.overdueCount": "{n} ያለፈ",  // draft – needs native review
  "da.register": "አርሶ አደር ይመዝግቡ",  // draft – needs native review
  "da.registerHint": "መተግበሪያው ለሌላቸው አርሶ አደሮች። ሁለቱን የፈቃድ ጥያቄዎች ጮክ ብለው ያንብቡ እና አርሶ አደሩ የተስማማበትን ብቻ ምልክት ያድርጉ።",  // draft – needs native review
  "da.pin": "ጊዜያዊ የይለፍ ቃል",  // draft – needs native review
  "da.pinHint": "ቢያንስ 6 ቁምፊዎች። ለአርሶ አደሩ ይስጡ፤ በኋላ መቀየር ይችላሉ።",  // draft – needs native review
  "da.kebele": "ቀበሌ (አማራጭ)",  // draft – needs native review
  "da.consentDataAsk": "አርሶ አደሩ የግብርና ባለሙያዎች የእርሻ መረጃቸውን እንዲያዩ ተስማምተዋል",  // draft – needs native review
  "da.consentAlertsAsk": "አርሶ አደሩ የበሽታ ማስጠንቀቂያዎችንና አስታዋሾችን ይፈልጋሉ",  // draft – needs native review
  "da.consentNoData": "ያለዚህ ስምምነት ከተመዘገበ በኋላ ይህን አርሶ አደር ማየት አይችሉም።",  // draft – needs native review
  "da.registered": "{name} ተመዝግበዋል።",  // draft – needs native review
  "da.actingFor": "የሚጠይቁት ለ",  // draft – needs native review
  "da.myself": "ለራሴ",  // draft – needs native review
  "da.inboxDescription": "አማካሪው መመለስ ያልቻላቸው ጥያቄዎች እና ሰው የሚያስፈልጋቸው ሰብሎች።",  // draft – needs native review
  "da.status.open": "ክፍት",  // draft – needs native review
  "da.status.answered": "ተመልሷል",  // draft – needs native review
  "da.status.forwarded": "ተላልፏል",  // draft – needs native review
  "da.status.closed": "ተዘግቷል",  // draft – needs native review
  "da.esc.low_confidence": "የፎቶ ምርመራው እርግጠኛ አይደለም",  // draft – needs native review
  "da.esc.no_knowledge": "በመመሪያዎቹ ውስጥ መልስ የለም",  // draft – needs native review
  "da.esc.guardrail_block": "ለደህንነት ቆሟል",  // draft – needs native review
  "da.esc.advice_failed": "ሰብሉ ባሰበት",  // draft – needs native review
  "da.esc.asked_for_person": "ሰው እንዲያናግራቸው ጠይቀዋል",  // draft – needs native review
  "da.question": "ጥያቄ",  // draft – needs native review
  "da.aiAnswer": "የአማካሪው መልስ",  // draft – needs native review
  "da.diagnosis": "የፎቶ ምርመራ፦ {disease} ({pct}%)",  // draft – needs native review
  "da.verified": "በDA የተረጋገጠ፦ {disease}",  // draft – needs native review
  "da.verifyLabel": "በሰብሉ ላይ ምን ያያሉ?",  // draft – needs native review
  "da.verify": "ማረጋገጫዬን አስቀምጥ",  // draft – needs native review
  "da.answerLabel": "ለአርሶ አደሩ የሚሰጡት መልስ",  // draft – needs native review
  "da.answerHint": "አርሶ አደሩ ይህንን በመተግበሪያው ያያሉ፤ ማዳመጥም ይችላሉ።",  // draft – needs native review
  "da.send": "መልሱን ላክ",  // draft – needs native review
  "da.forward": "ለአስተዳዳሪ አስተላልፍ",  // draft – needs native review
  "da.close": "ዝጋ",  // draft – needs native review
  "da.noEscalations": "እዚህ ምንም የለም።",  // draft – needs native review
  "da.resolution": "መልስ ወይም ማስታወሻ",  // draft – needs native review
  "da.saved": "ተቀምጧል።",  // draft – needs native review
  "users.da": "የልማት ሰራተኛ",  // draft – needs native review
  "users.noDa": "ሰራተኛ አልተመደበም",  // draft – needs native review

  // ── Crop calendar & seasons ───────────────────────────────────────────────
  "stage.establishment": "ዘር መዝራትና ብቅለት",  // draft – needs native review
  "stage.tillering": "መዋለድ",  // draft – needs native review
  "stage.stem_elongation": "የአንጓ መርዘም",  // draft – needs native review
  "stage.heading_flowering": "አባባ",  // draft – needs native review
  "stage.grain_fill": "የፍሬ ዕድገት",  // draft – needs native review
  "stage.maturity": "ብስለትና ምርት ስብሰባ",  // draft – needs native review
  "season.meher": "መኸር (ዋና ዝናብ)",  // draft – needs native review
  "season.belg": "በልግ (አጭር ዝናብ)",  // draft – needs native review
  "season.irrigated": "መስኖ",  // draft – needs native review
  "calendar.title": "የሰብሌ ቀን መቁጠሪያ",  // draft – needs native review
  "calendar.description": "ሰብልዎ አሁን የት እንዳለና ቀጥሎ ምን ማድረግ እንዳለብዎ፣ ከግብርና ሚኒስቴር የስንዴ መመሪያዎች።",  // draft – needs native review
  "calendar.estimated": "ግምታዊ ጊዜ ነው። ከልማት ሰራተኛዎ ጋር ያረጋግጡ።",  // draft – needs native review
  "calendar.planted": "የተዘራው {date}",  // draft – needs native review
  "calendar.day": "ከተዘራ {n}ኛ ቀን",  // draft – needs native review
  "calendar.now": "አሁን",  // draft – needs native review
  "calendar.tasks": "በዚህ ደረጃ ምን ማድረግ አለብዎት",  // draft – needs native review
  "calendar.tasksNote": "ሥራዎቹ በሚኒስቴሩ መመሪያዎች እንደተጻፉት (በእንግሊዝኛ) ቀርበዋል።",  // draft – needs native review
  "calendar.next": "ቀጣይ፦ {stage} በ{n} ቀናት ውስጥ",  // draft – needs native review
  "calendar.pastLast": "ይህ ሰብል የቀን መቁጠሪያውን የመጨረሻ ደረጃ አልፏል። በመገለጫዬ ውስጥ እንደተሰበሰበ ምልክት ያድርጉ።",  // draft – needs native review
  "calendar.unknown": "ለዚህ ሰብልና ቦታ እስካሁን የሰብል ቀን መቁጠሪያ የለም።",  // draft – needs native review
  "calendar.empty": "ምን እንደዘሩና መቼ እንደዘሩ ይንገሩን፤ የቀን መቁጠሪያው የሰብልዎን ደረጃና ሥራዎች ያሳያል።",  // draft – needs native review
  "calendar.addSeason": "የዘራሁትን ጨምር",  // draft – needs native review
  "calendar.source": "ምንጭ፦ {source}",  // draft – needs native review
  "seasons.button": "ወቅቶች",  // draft – needs native review
  "seasons.title": "የሰብል ወቅቶች፦ {field}",  // draft – needs native review
  "seasons.hint": "በአንድ ማሳ ላይ በአንድ ጊዜ አንድ ሰብል ብቻ። ሲጨርሱ እንደተሰበሰበ ምልክት ያድርጉ።",  // draft – needs native review
  "seasons.none": "እስካሁን የሰብል ወቅት የለም።",  // draft – needs native review
  "seasons.crop": "ሰብል",  // draft – needs native review
  "seasons.variety": "ዝርያ (አማራጭ)",  // draft – needs native review
  "seasons.planted": "የተዘራበት ቀን",  // draft – needs native review
  "seasons.kind": "ወቅት",  // draft – needs native review
  "seasons.harvest": "የሚጠበቅ የምርት ስብሰባ (አማራጭ)",  // draft – needs native review
  "seasons.add": "ወቅት ጨምር",  // draft – needs native review
  "seasons.markHarvested": "እንደተሰበሰበ ምልክት አድርግ",  // draft – needs native review
  "seasons.status.active": "እያደገ ነው",  // draft – needs native review
  "seasons.status.harvested": "ተሰብስቧል",  // draft – needs native review
  "seasons.status.failed": "አልተሳካም",  // draft – needs native review
  "seasons.growing": "አሁን እያደገ ያለው፦ {crop} ከ{date} ጀምሮ",  // draft – needs native review

  // ── Advisory settings, monitoring, audit log ──────────────────────────────
  "nav.advisorySettings": "የምክር ቅንብሮች",  // draft – needs native review
  "nav.monitoring": "ክትትል",  // draft – needs native review
  "nav.auditLog": "የኦዲት መዝገብ",  // draft – needs native review
  "perm.audit_read": "የኦዲት መዝገብ ማንበብ",  // draft – needs native review
  "perm.audit_read.desc": "በአስተዳደር ውስጥ ማን ምን እንደቀየረ፣ እና የአርሶ አደሮችን መረጃ ማን እንደከፈተ ማየት።",  // draft – needs native review
  "settings.description": "አማካሪው ለፎቶ ምርመራ፣ ለወረርሽኝ ማስጠንቀቂያ እና ለማስጠንቀቂያ ገደቦች የሚጠቀምባቸው መለኪያዎች። ለውጦች ወዲያውኑ ይሰራሉ።",  // draft – needs native review
  "settings.note": "እነዚህ የምርት ውሳኔዎች ናቸው እንጂ የግብርና ሳይንስ እውነታዎች አይደሉም። ለውጦችን ከግብርና ባለሙያዎች ቡድን ጋር ይስማሙባቸው።",  // draft – needs native review
  "settings.allowed": "የሚፈቀድ፦ ከ{min} እስከ {max}",  // draft – needs native review
  "settings.default": "ነባሪ፦ {value}",  // draft – needs native review
  "settings.save": "አስቀምጥ",  // draft – needs native review
  "settings.saved": "ተቀምጧል፦ {name}።",  // draft – needs native review
  "settings.on": "በርቷል",  // draft – needs native review
  "settings.off": "ጠፍቷል",  // draft – needs native review
  "settings.diagnosis_confidence_threshold": "የፎቶ ምርመራ፦ ዝቅተኛ እርግጠኝነት",  // draft – needs native review
  "settings.diagnosis_confidence_threshold.hint": "ከዚህ እርግጠኝነት (0 እስከ 1) በታች ሲሆን የፎቶ ምርመራው እርግጠኛ ያልሆነ ተብሎ ለDA ይላካል።",  // draft – needs native review
  "settings.follow_up_days": "ክትትል ከ(ቀናት) በኋላ",  // draft – needs native review
  "settings.follow_up_days.hint": "ሰብሉ መሻሻሉን ከመጠየቅ በፊት ከፎቶ ምርመራ በኋላ ያሉ ቀናት።",  // draft – needs native review
  "settings.outbreak_radius_km": "የወረርሽኝ ራዲየስ (ኪ.ሜ)",  // draft – needs native review
  "settings.outbreak_radius_km.hint": "የጎረቤቶች የበሽታ ምርመራዎች የሚቆጠሩበት ርቀት።",  // draft – needs native review
  "settings.outbreak_window_days": "ወደኋላ የሚታዩ ቀናት (ወረርሽኝ)",  // draft – needs native review
  "settings.outbreak_window_days.hint": "በእነዚህ የቅርብ ቀናት ውስጥ ያሉ ምርመራዎች ብቻ ይቆጠራሉ።",  // draft – needs native review
  "settings.outbreak_min_scans": "ማስጠንቀቂያ የሚያስነሱ ምርመራዎች",  // draft – needs native review
  "settings.outbreak_min_scans.hint": "በራዲየሱና በጊዜው ውስጥ የወረርሽኝ ማስጠንቀቂያ የሚያስነሱ የአንድ በሽታ ምርመራዎች ብዛት።",  // draft – needs native review
  "settings.outbreak_verified_only": "በDA የተረጋገጡትን ብቻ ቁጠር",  // draft – needs native review
  "settings.outbreak_verified_only.hint": "ሲበራ፦ DA ያረጋገጣቸው ምርመራዎች ብቻ ለወረርሽኝ ማስጠንቀቂያ ይቆጠራሉ።",  // draft – needs native review
  "settings.diagnosis_history_days": "ለአማካሪው የፎቶ ምርመራ ታሪክ (ቀናት)",  // draft – needs native review
  "settings.diagnosis_history_days.hint": "አማካሪው የአርሶ አደሩን የፎቶ ምርመራዎች ምን ያህል ወደኋላ እንደሚያይ።",  // draft – needs native review
  "settings.max_alerts_per_week": "በሳምንት ለአንድ አርሶ አደር ማስጠንቀቂያዎች",  // draft – needs native review
  "settings.max_alerts_per_week.hint": "ነባሪ ሳምንታዊ ገደብ፤ ተጨማሪ ማስጠንቀቂያዎች ይያዛሉ።",  // draft – needs native review
  "settings.strict_dose_policy": "ጥብቅ የመጠን ፖሊሲ",  // draft – needs native review
  "settings.strict_dose_policy.hint": "ሲበራ፦ ሁሉም መጠኖች ከተረጋገጠው የመጠን ሰንጠረዥ መምጣት አለባቸው። ሲጠፋ፦ ትክክለኛው አሃዝ በተጠቀሰ የሚኒስቴር ጽሑፍ ውስጥ ካለ የማዳበሪያና የዘር መጠን ሊጠቀስ ይችላል። የፀረ-ተባይ መጠኖች ሁልጊዜ ከሰንጠረዡ ብቻ ናቸው።",  // draft – needs native review
  "monitor.description": "አማካሪው እንዴት እየተጠቀመበት እንደሆነ። ድምሮች ብቻ፣ የግል መረጃ የለም።",  // draft – needs native review
  "monitor.days": "ያለፉት {n} ቀናት",  // draft – needs native review
  "monitor.questions": "ጥያቄዎች",  // draft – needs native review
  "monitor.escalationRate": "ለሰው የተላለፉ",  // draft – needs native review
  "monitor.diagnoses": "የፎቶ ምርመራዎች",  // draft – needs native review
  "monitor.agreement": "DA ከፎቶ ምርመራው ጋር የተስማማበት",  // draft – needs native review
  "monitor.resolveTime": "የመልስ መካከለኛ ጊዜ",  // draft – needs native review
  "monitor.hours": "{n} ሰዓት",  // draft – needs native review
  "monitor.consentData": "መረጃ የሚያጋሩ አርሶ አደሮች",  // draft – needs native review
  "monitor.ofFarmers": "ከ{total} አርሶ አደሮች {n}",  // draft – needs native review
  "monitor.perDay": "በቀን ጥያቄዎችና የፎቶ ምርመራዎች",  // draft – needs native review
  "monitor.byLanguage": "ጥያቄዎች በቋንቋ",  // draft – needs native review
  "monitor.confidence": "የመልስ እርግጠኝነት",  // draft – needs native review
  "monitor.flags": "የተቀሰቀሱ የደህንነት ፍተሻዎች",  // draft – needs native review
  "monitor.feedback": "የአርሶ አደር አስተያየት",  // draft – needs native review
  "monitor.byDisease": "የፎቶ ምርመራዎች በበሽታ",  // draft – needs native review
  "monitor.outcomes": "የክትትል ውጤቶች",  // draft – needs native review
  "monitor.escReasons": "ጉዳዮች ለሰው የተላለፉበት ምክንያት",  // draft – needs native review
  "monitor.alerts": "ማስጠንቀቂያዎች",  // draft – needs native review
  "monitor.none": "በዚህ ጊዜ ውስጥ መረጃ የለም።",  // draft – needs native review
  "monitor.uncertain": "እርግጠኛ ያልሆነ",  // draft – needs native review
  "audit.description": "በአስተዳደር ውስጥ ማን ምን እንደቀየረ፣ እና የአርሶ አደሮችን መረጃ ማን እንደከፈተ። የጥያቄዎቹ ይዘት በፍጹም አይቀመጥም።",  // draft – needs native review
  "audit.filter": "በድርጊት አጣራ",  // draft – needs native review
  "audit.when": "መቼ",  // draft – needs native review
  "audit.who": "ማን",  // draft – needs native review
  "audit.action": "ድርጊት",  // draft – needs native review
  "audit.target": "መዝገብ",  // draft – needs native review
  "audit.result": "ውጤት",  // draft – needs native review
  "audit.read": "የአርሶ አደር መረጃ ተከፍቷል",  // draft – needs native review
  "audit.loadMore": "ተጨማሪ ጫን",  // draft – needs native review
  "audit.none": "ምንም መዝገብ የለም።",  // draft – needs native review
  "audit.unknownActor": "ያልገባ ተጠቃሚ",  // draft – needs native review

  // ── Area reports & government role ────────────────────────────────────────
  "role.government": "መንግሥት (ለማንበብ ብቻ)",  // draft – needs native review
  "role.government.desc": "የወረዳ፣ የክልል ቢሮ፣ የATI ወይም የግብርና ሚኒስቴር ሰራተኞች። ለአካባቢያቸው የተጠቃለሉ ሪፖርቶችንና የወረርሽኝ ካርታዎችን ያያሉ፤ ነጠላ አርሶ አደሮችን በፍጹም አያዩም።",  // draft – needs native review
  "perm.reports_read": "የአካባቢ ሪፖርቶችን ማየት",  // draft – needs native review
  "perm.reports_read.desc": "ለአካባቢያቸው የተጠቃለሉ አሃዞች፦ የደረሱ አርሶ አደሮች፣ የፎቶ ምርመራዎች በበሽታ፣ ወረርሽኞች፣ ማስጠንቀቂያዎች። ትናንሽ ቁጥሮች ይደበቃሉ።",  // draft – needs native review
  "nav.reports": "የአካባቢ ሪፖርቶች",  // draft – needs native review
  "reports.description": "የአካባቢዎ ድምሮች፦ የደረሱ አርሶ አደሮች፣ የፎቶ ምርመራዎች በበሽታ፣ ወረርሽኞችና ማስጠንቀቂያዎች። ነጠላ አርሶ አደሮች አይታዩም።",  // draft – needs native review
  "reports.scope": "አካባቢ፦ {area}",  // draft – needs native review
  "reports.country": "መላ ሀገሪቱ",  // draft – needs native review
  "reports.period": "ያለፉት {n} ቀናት",  // draft – needs native review
  "reports.export": "CSV ላክ",  // draft – needs native review
  "reports.print": "አትም ወይም እንደ PDF አስቀምጥ",  // draft – needs native review
  "reports.farmers": "የተመዘገቡ አርሶ አደሮች",  // draft – needs native review
  "reports.reached": "የደረሱ አርሶ አደሮች",  // draft – needs native review
  "reports.questions": "ጥያቄዎች",  // draft – needs native review
  "reports.photoChecks": "የፎቶ ምርመራዎች",  // draft – needs native review
  "reports.outbreakAlerts": "የወረርሽኝ ማስጠንቀቂያዎች",  // draft – needs native review
  "reports.escalations": "ለDA የተላኩ ጉዳዮች",  // draft – needs native review
  "reports.outcomes": "ክትትል፦ ተሻለ / ያው / ባሰ",  // draft – needs native review
  "reports.byDisease": "የፎቶ ምርመራዎች በበሽታ",  // draft – needs native review
  "reports.woredas": "በወረዳ",  // draft – needs native review
  "reports.col.woreda": "ወረዳ",  // draft – needs native review
  "reports.col.zone": "ዞን",  // draft – needs native review
  "reports.noData": "በዚህ አካባቢና ጊዜ ምንም እንቅስቃሴ የለም።",  // draft – needs native review
  "reports.map": "የወረርሽኝ ቅድመ ማስጠንቀቂያ",  // draft – needs native review
  "reports.mapHint": "ባለፉት {n} ቀናት የተደረጉ የበሽታ ሪፖርቶች፣ በወረዳው መሀል ላይ የተቀመጡ (በእርሻዎቹ ላይ አይደለም)። ትልቅ ነጥብ ብዙ ሪፖርት ማለት ነው።",  // draft – needs native review
  "reports.demo": "ናሙና መዛግብትን አካት",  // draft – needs native review
  "reports.demoBadge": "ናሙና መዛግብትን ያካትታል",  // draft – needs native review
  "reports.band.high": "10 ወይም ከዚያ በላይ",  // draft – needs native review
  "reports.band.medium": "ከ5 እስከ 9",  // draft – needs native review
  "reports.band.low": "ከ5 በታች",  // draft – needs native review
  "reports.noOutbreaks": "በዚህ ጊዜ ውስጥ የበሽታ ሪፖርት የለም።",  // draft – needs native review
  "reports.suppressedNote": "\"<5\" ማለት ከ1 እስከ 4 ማለት ነው። ማንም አርሶ አደር እንዳይለይ ትናንሽ ቁጥሮች ይደበቃሉ።",  // draft – needs native review
  "reports.latest": "የመጨረሻው {date}",  // draft – needs native review

  // ── Input Trust ───────────────────────────────────────────────────────────
  "nav.verify": "ምርት ያረጋግጡ",  // draft – needs native review
  "nav.supplier": "የአቅራቢ መግቢያ",  // draft – needs native review
  "nav.orgs": "ድርጅቶች",  // draft – needs native review
  "role.supplier": "አቅራቢ",  // draft – needs native review
  "role.supplier.desc": "የግብዓት አቅራቢ ሰራተኛ። የድርጅቱን ምርቶችና የኮድ ስብስቦች ያስተዳድራል፤ ኮዶቹ የት እንደሚረጋገጡም ያያል።",  // draft – needs native review
  "perm.inputs_verify": "የምርት ኮድ ማረጋገጥ",  // draft – needs native review
  "perm.inputs_verify.desc": "የዘር፣ የማዳበሪያ ወይም የኬሚካል እሽግ ትክክለኛ መሆኑን ማረጋገጥና የተጠረጠረ ሀሰተኛ ምርትን ሪፖርት ማድረግ።",  // draft – needs native review
  "perm.supplier_manage": "የራስን አቅራቢ ድርጅት ማስተዳደር",  // draft – needs native review
  "perm.supplier_manage.desc": "ምርቶችን መዘርዘር፣ የኮድ ስብስቦችና መለያዎችን መፍጠር፣ ስብስቦችን መመለስ እና የማረጋገጫ ሪፖርቶችን ማየት።",  // draft – needs native review
  "perm.orgs_manage": "ድርጅቶችን ማስተዳደር",  // draft – needs native review
  "perm.orgs_manage.desc": "የአቅራቢ ድርጅቶችን መፍጠር፣ ተጠቃሚዎቻቸውን መጨመር እና ማገድ።",  // draft – needs native review
  "demo.message.trust": "የምርት ዝርዝሩ ከግብርና ሚኒስቴር የስንዴ ማኑዋል የተወሰደ ነው። የምዝገባ ቁጥሮች ይፋዊው የEAA መዝገብ ሲገናኝ ይመጣሉ።",  // draft – needs native review
  "trust.description": "በዘር፣ በማዳበሪያ ወይም በኬሚካል እሽግ ላይ ያለውን QR ኮድ ይቃኙ ወይም ኮዱን ይጻፉ፤ ትክክለኛ መሆኑን ይወቁ።",  // draft – needs native review
  "trust.codeLabel": "የምርት ኮድ",  // draft – needs native review
  "trust.codePlaceholder": "ለምሳሌ AB3D-EF7H-JK9M",  // draft – needs native review
  "trust.check": "አረጋግጥ",  // draft – needs native review
  "trust.scan": "QR ኮድ ቃኝ",  // draft – needs native review
  "trust.scanStop": "ካሜራ አቁም",  // draft – needs native review
  "trust.scanUnsupported": "ይህ ብራውዘር QR ኮድ መቃኘት አይችልም። ከQR በታች የታተመውን ኮድ ይጻፉ።",  // draft – needs native review
  "trust.genuine": "ትክክለኛ",  // draft – needs native review
  "trust.warning": "ማስጠንቀቂያ",  // draft – needs native review
  "trust.genuineText": "ይህ ኮድ ከሚታወቅ አቅራቢ የተገኘ የተመዘገበ ምርት ነው።",  // draft – needs native review
  "trust.reason.unknown_code": "ይህን ኮድ አናውቀውም። እሽጉ ሀሰተኛ ሊሆን ይችላል። አይጠቀሙበት፤ ከታች ሪፖርት ያድርጉ።",  // draft – needs native review
  "trust.reason.recalled": "አቅራቢው ይህን ስብስብ መልሷል። አይጠቀሙበት፤ ወደ ሱቁ ይመልሱት።",  // draft – needs native review
  "trust.reason.supplier_suspended": "ይህ አቅራቢ ታግዷል። ይህን ምርት ከመጠቀምዎ በፊት የልማት ሰራተኛዎን ይጠይቁ።",  // draft – needs native review
  "trust.reason.not_registered": "ይህ ምርት በተመዘገቡ ምርቶች ዝርዝር ውስጥ የለም። አይጠቀሙበት።",  // draft – needs native review
  "trust.reason.expired": "የዚህ ስብስብ የአገልግሎት ጊዜ አልፏል። አይጠቀሙበት።",  // draft – needs native review
  "trust.reason.possible_copy": "ይህ ኮድ ከሚጠበቀው በላይ ብዙ ጊዜ ወይም በብዙ ቦታዎች ተረጋግጧል። በሀሰተኛ እሽጎች ላይ ተገልብጦ ሊሆን ይችላል። እሽጉን በጥንቃቄ ይመርምሩ፤ የልማት ሰራተኛዎን ይጠይቁ።",  // draft – needs native review
  "trust.product": "ምርት",  // draft – needs native review
  "trust.ingredient": "ዋና ንጥረ ነገር",  // draft – needs native review
  "trust.registration": "የምዝገባ ቁጥር",  // draft – needs native review
  "trust.supplier": "አቅራቢ",  // draft – needs native review
  "trust.batch": "ስብስብ",  // draft – needs native review
  "trust.expires": "የሚያበቃበት",  // draft – needs native review
  "trust.batchNote": "አንድ ኮድ ሙሉ ስብስብን ይሸፍናል። ትክክለኛ ውጤት ኮዱ እውነተኛ መሆኑን ያሳያል፤ ይህ እሽግ በጭራሽ እንዳልተገለበጠ ግን ማረጋገጥ አይችልም።",  // draft – needs native review
  "trust.reportTitle": "የተጠረጠረ ሀሰተኛ ምርት ሪፖርት ያድርጉ",  // draft – needs native review
  "trust.reportHint": "ያገኙትን ይንገሩን። ወረዳዎ ከመገለጫዎ ይጨመራል፤ ስምዎ ለአቅራቢው አይታይም።",  // draft – needs native review
  "trust.reportProduct": "ምርት (በዝርዝሩ ውስጥ ካለ)",  // draft – needs native review
  "trust.reportProductText": "በእሽጉ ላይ ያለው የምርት ስም",  // draft – needs native review
  "trust.reportShop": "የገዙበት ቦታ (ሱቅ ወይም ገበያ)",  // draft – needs native review
  "trust.reportNote": "ምን የተሳሳተ ይመስላል?",  // draft – needs native review
  "trust.reportSend": "ሪፖርት ላክ",  // draft – needs native review
  "trust.reportSent": "እናመሰግናለን። ሪፖርትዎ ተልኳል።",  // draft – needs native review
  "trust.notListed": "በዝርዝሩ ውስጥ የለም",  // draft – needs native review
  "supplier.description": "ምርቶችዎ፣ የኮድ ስብስቦችዎ እና ኮዶችዎ የት እንደሚረጋገጡ።",  // draft – needs native review
  "supplier.chooseOrg": "ድርጅት",  // draft – needs native review
  "supplier.catalogue": "የእኔ ምርቶች",  // draft – needs native review
  "supplier.catalogueHint": "ከተመዘገቡ ምርቶች ዝርዝር ይምረጡ። ኮድ መፍጠር የሚችሉት እዚህ ለተዘረዘሩ ምርቶች ብቻ ነው።",  // draft – needs native review
  "supplier.addProduct": "ምርት ጨምር",  // draft – needs native review
  "supplier.remove": "አስወግድ",  // draft – needs native review
  "supplier.noProducts": "እስካሁን ምርት የለም።",  // draft – needs native review
  "supplier.batches": "የኮድ ስብስቦች",  // draft – needs native review
  "supplier.batchesHint": "እያንዳንዱ ስብስብ አንድ ኮድ ያገኛል። መለያውን በዚያ ስብስብ እያንዳንዱ እሽግ ላይ ያትሙ።",  // draft – needs native review
  "supplier.newBatch": "አዲስ ስብስብ",  // draft – needs native review
  "supplier.batchNumber": "የስብስብ ቁጥር",  // draft – needs native review
  "supplier.units": "የእሽጎች ብዛት",  // draft – needs native review
  "supplier.manufactured": "የተመረተበት ቀን",  // draft – needs native review
  "supplier.expires": "የሚያበቃበት ቀን",  // draft – needs native review
  "supplier.create": "ስብስብ ፍጠር",  // draft – needs native review
  "supplier.label": "መለያ አትም",  // draft – needs native review
  "supplier.recall": "መልስ",  // draft – needs native review
  "supplier.recallConfirm": "ስብስብ {batch} ይመለስ? ከዚያ በኋላ የዚህ ኮድ እያንዳንዱ ማረጋገጫ የመመለስ ማስጠንቀቂያ ያሳያል።",  // draft – needs native review
  "supplier.recalled": "ተመልሷል",  // draft – needs native review
  "supplier.active": "ንቁ",  // draft – needs native review
  "supplier.checks": "ማረጋገጫዎች",  // draft – needs native review
  "supplier.warnings": "ማስጠንቀቂያዎች",  // draft – needs native review
  "supplier.noBatches": "እስካሁን ስብስብ የለም።",  // draft – needs native review
  "supplier.report": "ኮዶችዎ የት እንደሚረጋገጡ",  // draft – needs native review
  "supplier.reportHint": "ያለፉት {n} ቀናት። የአርሶ አደሮች ስም በፍጹም አይታይም።",  // draft – needs native review
  "supplier.byReason": "ውጤቶች",  // draft – needs native review
  "supplier.byWoreda": "በወረዳ",  // draft – needs native review
  "supplier.fakes": "የተጠረጠሩ ሀሰተኛ ምርቶች ሪፖርቶች",  // draft – needs native review
  "supplier.noFakes": "ሪፖርት የለም።",  // draft – needs native review
  "orgs.description": "የአቅራቢ ድርጅቶችና ተጠቃሚዎቻቸው። ተጠቃሚ ከመጨመሩ በፊት የአቅራቢ ሚና ሊኖረው ይገባል።",  // draft – needs native review
  "orgs.new": "አዲስ ድርጅት",  // draft – needs native review
  "orgs.name": "ስም",  // draft – needs native review
  "orgs.note": "ማስታወሻ (አማራጭ)",  // draft – needs native review
  "orgs.create": "ፍጠር",  // draft – needs native review
  "orgs.members": "ተጠቃሚዎች",  // draft – needs native review
  "orgs.addMember": "ተጠቃሚ ጨምር",  // draft – needs native review
  "orgs.phone": "የተጠቃሚው ስልክ ቁጥር",  // draft – needs native review
  "orgs.owner": "ባለቤት",  // draft – needs native review
  "orgs.staff": "ሰራተኛ",  // draft – needs native review
  "orgs.suspend": "አግድ",  // draft – needs native review
  "orgs.activate": "አንቃ",  // draft – needs native review
  "orgs.suspended": "ታግዷል",  // draft – needs native review
  "orgs.none": "እስካሁን ድርጅት የለም።",  // draft – needs native review
  "orgs.batchesCount": "{n} ስብስቦች",  // draft – needs native review

  // ── Voice questions ───────────────────────────────────────────────────────
  "voice.record": "ጥያቄዎን በድምፅ ይናገሩ",  // draft – needs native review
  "voice.stop": "መቅዳት አቁም",  // draft – needs native review
  "voice.working": "ንግግርዎ ወደ ጽሑፍ እየተቀየረ ነው…",  // draft – needs native review
  "voice.privacy": "እየተቀዳ ነው… ድምፅዎ ወደ ጽሑፍ ለመቀየር ብቻ ወደ Google Gemini ይላካል። አይቀመጥም።",  // draft – needs native review
  "voice.unsupported": "የድምፅ ጥያቄ ማይክሮፎን ይፈልጋል፤ ይህ ብራውዘር የሚፈቅደው ደህንነቱ በተጠበቀ (https) ግንኙነት ብቻ ነው። እባክዎ ጥያቄዎን ይጻፉ።",  // draft – needs native review
  "voice.check": "ጽሑፉን ያረጋግጡ፣ ከዚያ ይላኩ።",  // draft – needs native review
  "voice.unverified": "ለዚህ ቋንቋ የድምፅ ማወቂያ አዲስ ነው። ጽሑፉን በጥንቃቄ ያረጋግጡ፣ ከዚያ ይላኩ።",  // draft – needs native review

  // ── Delete my data ────────────────────────────────────────────────────────
  "nav.erasure": "የመረጃ ስረዛ ጥያቄዎች",  // draft – needs native review
  "seasons.noGuidance": "ለዚህ ሰብል እስካሁን የሰብል ቀን መቁጠሪያ ወይም ምክር የለም። የሚኒስቴሩ መመሪያዎች ወደ እውቀት ቋቱ ሲገቡ ይጨመራል።",  // draft – needs native review
  "erase.title": "መረጃዬን ሰርዝ",  // draft – needs native review
  "erase.hint": "መድረኩ ስለእርስዎ የያዘው ሁሉ እንዲሰረዝ መጠየቅ ይችላሉ። አስተዳዳሪ በመጀመሪያ ጥያቄውን ያረጋግጣል። ስም-አልባ ቆጠራዎች (ለምሳሌ ስንት የፎቶ ምርመራዎች በሽታ እንዳገኙ) ይቀመጣሉ።",  // draft – needs native review
  "erase.reason": "ምክንያት (አማራጭ)",  // draft – needs native review
  "erase.request": "መረጃዬ እንዲሰረዝ ጠይቅ",  // draft – needs native review
  "erase.confirm": "አስተዳዳሪ ካጸደቀ በኋላ እርሻዎችዎ፣ ጥያቄዎችዎ፣ ማስጠንቀቂያዎችዎና ፎቶዎችዎ ይሰረዛሉ፤ መለያዎም ይዘጋል። ይህ ሊቀለበስ አይችልም።",  // draft – needs native review
  "erase.pending": "ስረዛ ተጠይቋል",  // draft – needs native review
  "erase.since": "ከ{date} ጀምሮ አስተዳዳሪን በመጠባበቅ ላይ።",  // draft – needs native review
  "erase.cancel": "ጥያቄውን ሰርዝ",  // draft – needs native review
  "erase.rejected": "የመጨረሻው ጥያቄዎ አልጸደቀም፦ {note}",  // draft – needs native review
  "erase.legalDraft": "ረቂቅ ጽሑፍ፣ የሕግ ግምገማ በመጠባበቅ ላይ (የግል መረጃ ጥበቃ አዋጅ 1321/2024)።",  // draft – needs native review
  "erase.adminDescription": "መረጃቸው እንዲሰረዝ የሚፈልጉ ሰዎች ጥያቄዎች። ማጽደቅ እርሻዎቻቸውን፣ ጥያቄዎቻቸውን፣ ማስጠንቀቂያዎቻቸውንና ፎቶዎቻቸውን ይሰርዛል፤ መለያውንም ወዲያውኑ ስም-አልባ ያደርጋል።",  // draft – needs native review
  "erase.status.pending": "በመጠባበቅ ላይ",  // draft – needs native review
  "erase.status.approved": "ጸድቋል",  // draft – needs native review
  "erase.status.rejected": "ውድቅ ተደርጓል",  // draft – needs native review
  "erase.status.cancelled": "ተሰርዟል",  // draft – needs native review
  "erase.none": "እዚህ ምንም ጥያቄ የለም።",  // draft – needs native review
  "erase.note": "ማስታወሻ (ለምሳሌ ጥያቄውን እንዴት እንዳረጋገጡ)",  // draft – needs native review
  "erase.approve": "አጽድቅና ሰርዝ",  // draft – needs native review
  "erase.reject": "ውድቅ አድርግ",  // draft – needs native review
  "erase.approveConfirm": "የ{name} መረጃ አሁን ይሰረዝ? ይህ ሊቀለበስ አይችልም።",  // draft – needs native review

  // ── Agronomist review ─────────────────────────────────────────────────────
  "nav.review": "የይዘት ግምገማ",  // draft – needs native review
  "role.agronomist": "የግብርና ባለሙያ / የይዘት ገምጋሚ",  // draft – needs native review
  "role.agronomist.desc": "የይዘት ገምጋሚ። በDA የተላለፉ ጥያቄዎችን ይመልሳል፣ የእውቀት ቋቱን፣ ፕሮቶኮሎችን፣ የሰብል ቀን መቁጠሪያንና የመጠን ሰንጠረዦችን ይጠብቃል፣ ለድጋሚ ስልጠና ፎቶዎችን ይለያል፣ ትርጉሞችንም ያጸድቃል።",  // draft – needs native review
  "perm.content_review": "የምክር ይዘትን መገምገም",  // draft – needs native review
  "perm.content_review.desc": "የተላለፉ ጥያቄዎችን መመለስ፣ የፕሮቶኮል / ቀን መቁጠሪያ / መጠን ሰንጠረዦችን ማስተካከል፣ ፎቶዎችን መለየት፣ ትርጉሞችን ማጽደቅ።",  // draft – needs native review
  "review.description": "DAዎች መመለስ ያልቻሏቸው ጥያቄዎች፣ የምክሩ የይዘት ሰንጠረዦች፣ ለድጋሚ ስልጠና የፎቶ መለያዎች እና የትርጉም ማጽደቅ።",  // draft – needs native review
  "review.tab.queue": "የተላለፉ ጥያቄዎች",  // draft – needs native review
  "review.tab.content": "የይዘት ሰንጠረዦች",  // draft – needs native review
  "review.tab.labels": "የፎቶ መለያዎች",  // draft – needs native review
  "review.tab.translations": "ትርጉሞች",  // draft – needs native review
  "review.queueEmpty": "የተላለፈ ጥያቄ የለም።",  // draft – needs native review
  "review.daNote": "የDA ማስታወሻ",  // draft – needs native review
  "review.promote": "ይህን መልስ ወደ እውቀት ቋቱም ጨምር",  // draft – needs native review
  "review.kbQuestion": "ጥያቄው በአጠቃላይ አገላለጽ",  // draft – needs native review
  "review.kbQuestionHint": "ስሞች፣ ስልክ ቁጥሮች ወይም ቦታዎች አይጻፉ። አማካሪው በባለሙያ የተገመገመ መልስ ብሎ ይጠቅሰዋል።",  // draft – needs native review
  "review.contentHint": "ሰንጠረዥ ያውርዱ፣ በስፕሬድሺት ያስተካክሉት፣ እንደገና ይጫኑት። እያንዳንዱ ረድፍ ይፈተሻል፤ ምንጭ የሌላቸው ረድፎች እንዳልተረጋገጡ ምልክት ይቆያሉ።",  // draft – needs native review
  "review.table.calendar": "የሰብል ቀን መቁጠሪያ ደንቦች",  // draft – needs native review
  "review.table.protocols": "የሕክምና ፕሮቶኮሎች",  // draft – needs native review
  "review.table.dosage": "የመጠን ደንቦች",  // draft – needs native review
  "review.download": "CSV አውርድ",  // draft – needs native review
  "review.upload": "CSV ጫን",  // draft – needs native review
  "review.uploaded": "{n} ረድፎች ተጭነዋል ({p} አሁንም እንዳልተረጋገጡ ምልክት ተደርገዋል)።",  // draft – needs native review
  "review.labelsHint": "የDA ምርመራ ከሞዴሉ የተለየበት የፎቶ ምርመራዎች። ትክክለኛውን መለያ ያረጋግጡ፤ መለያዎቹ ሞዴሉን እንደገና ለማሰልጠን ይላካሉ።",  // draft – needs native review
  "review.exportLabels": "መለያዎችን ላክ",  // draft – needs native review
  "review.noCorrections": "እስካሁን የተስተካከለ የፎቶ ምርመራ የለም።",  // draft – needs native review
  "review.model": "ሞዴል",  // draft – needs native review
  "review.da": "DA",  // draft – needs native review
  "review.label": "መለያ",  // draft – needs native review
  "review.saveLabel": "መለያ አስቀምጥ",  // draft – needs native review
  "review.labelled": "ተለይቷል",  // draft – needs native review
  "review.translationsHint": "እያንዳንዱን ትርጉም ያጽድቁ ወይም የተሻለ ጽሑፍ ይጠቁሙ። ጥቆማዎቹ ለገንቢዎች ወደ ፋይሎቹ እንዲያስገቡ ይላካሉ።",  // draft – needs native review
  "review.exportReviews": "ግምገማዎችን ላክ",  // draft – needs native review
  "review.source": "ጽሑፎች",  // draft – needs native review
  "review.sourceUi": "ገጾች",  // draft – needs native review
  "review.sourceAdvisory": "የአማካሪ መልእክቶች",  // draft – needs native review
  "review.search": "ፈልግ",  // draft – needs native review
  "review.onlyOpen": "ያልተገመገሙ ብቻ",  // draft – needs native review
  "review.count": "{n} ጽሑፎች",  // draft – needs native review
  "review.approved": "ጸድቋል",  // draft – needs native review
  "review.changes": "ለውጥ ተጠቁሟል",  // draft – needs native review
  "review.approve": "አጽድቅ",  // draft – needs native review
  "review.suggest": "ለውጥ ጠቁም",  // draft – needs native review
  "review.saveSuggestion": "ጥቆማ አስቀምጥ",  // draft – needs native review

  // ── Agro-dealer shops ─────────────────────────────────────────────────────
  "nav.dealer": "ሱቄ",  // draft – needs native review
  "role.agro_dealer": "የግብርና ግብዓት ነጋዴ (ሱቅ)",  // draft – needs native review
  "role.agro_dealer.desc": "የግብዓት ችርቻሮ ሱቅ ሰራተኛ። የሱቁን መረጃና ያሉትን ምርቶች ይጠብቃል፣ በሽያጭ ጊዜ የምርት ኮዶችን ያረጋግጣል።",  // draft – needs native review
  "perm.dealer_manage": "የራስን ሱቅ ማስተዳደር",  // draft – needs native review
  "perm.dealer_manage.desc": "የሱቁን መረጃና ያሉትን ምርቶች መጠበቅ፣ ሲሸጥ የምርት ኮዶችን ማረጋገጥ።",  // draft – needs native review
  "dealer.description": "የሱቅዎ ቦታና ስልክ፣ የሚሸጧቸው የተመዘገቡ ምርቶች፣ እና ከሽያጭ በፊት የኮድ ማረጋገጫ።",  // draft – needs native review
  "dealer.notVerified": "ገና አልተረጋገጠም",  // draft – needs native review
  "dealer.badgeHint": "አስተዳዳሪ ሱቁን ካረጋገጠ በኋላ የተረጋገጠ ሻጭ ምልክት ይሰጣል። ለአርሶ አደሮች የሚታዩት የተረጋገጡ ሱቆች ብቻ ናቸው።",  // draft – needs native review
  "dealer.phone": "የሱቅ ስልክ",  // draft – needs native review
  "dealer.products": "የምሸጣቸው ምርቶች",  // draft – needs native review
  "dealer.productsHint": "የተመዘገቡ ምርቶች ብቻ። ሲያልቅ \"በክምችት አለ\"ን ያጥፉ፤ አርሶ አደሮች ወደ እርስዎ እንዳይላኩ።",  // draft – needs native review
  "dealer.inStock": "በክምችት አለ",  // draft – needs native review
  "dealer.check": "ከመሸጥዎ በፊት እሽጉን ያረጋግጡ",  // draft – needs native review
  "dealer.checkHint": "በእሽጉ ላይ ያለውን ኮድ ይጻፉ ወይም ይቃኙ። ማረጋገጫው ለሱቅዎ ይመዘገባል።",  // draft – needs native review
  "shops.title": "በአቅራቢያዎ ያሉ የተረጋገጡ ሱቆች",  // draft – needs native review
  "shops.withProduct": "ይህ ምርት ያላቸው የተረጋገጡ ሱቆች",  // draft – needs native review
  "shops.hint": "የተረጋገጠ ሻጭ ምልክት ያላቸው ሱቆች፣ በቅርበት የተደረደሩ። ቅደም ተከተሉ በርቀት ብቻ ነው፤ ማንም ሱቅ መጀመሪያ ለመሆን አይከፍልም።",  // draft – needs native review
  "shops.none": "እስካሁን የተረጋገጠ ሱቅ አልተገኘም።",  // draft – needs native review
  "shops.badge": "የተረጋገጠ ሻጭ",  // draft – needs native review
  "orgs.type": "ዓይነት",  // draft – needs native review
  "orgs.type.supplier": "የግብዓት አቅራቢ",  // draft – needs native review
  "orgs.type.agro_dealer": "የግብርና ግብዓት ሱቅ",  // draft – needs native review
  "orgs.type.abc": "የአርሶ አደሮች የግብርና ንግድ ኩባንያ (ABC)",  // draft – needs native review
  "orgs.type.commercial_farm": "የንግድ እርሻ",  // draft – needs native review
  "orgs.type.ngo": "መንግሥታዊ ያልሆነ ድርጅት / ፕሮጀክት",  // draft – needs native review

  // ── Demand and supply outlook ─────────────────────────────────────────────
  "demand.title": "ፍላጎት በዞን",  // draft – needs native review
  "demand.hint": "ያለፉት 90 ቀናት፦ ምርቶችዎ የሚያነጣጥሯቸውን በሽታዎች ያገኙ የፎቶ ምርመራዎች፣ እና የሚመለከቷቸውን ሰብሎች የሚያመርቱ እርሻዎች። ካርታው ለምርቶችዎ የኮድ ማስጠንቀቂያዎችንም (ሊሆኑ የሚችሉ ሀሰተኛ) ያሳያል፤ መግለጫውን ይመልከቱ።",  // draft – needs native review
  "demand.checks": "የፎቶ ምርመራዎች",  // draft – needs native review
  "demand.warnings": "የኮድ ማስጠንቀቂያዎች",  // draft – needs native review
  "outlook.title": "የምርት ስብሰባ ትንበያ በዞን",  // draft – needs native review
  "outlook.hint": "አርሶ አደሮች ከሚመዘግቧቸው የሰብል ወቅቶች፦ ሰብሉን የሚያመርቱ እርሻዎች ብዛትና ለመሰብሰብ የሚጠብቁበት ጊዜ። የምርት መጠን አይገመትም።",  // draft – needs native review
  "outlook.allCrops": "ሁሉም ሰብሎች",  // draft – needs native review
  "outlook.farms": "እርሻዎች",  // draft – needs native review
  "outlook.area": "ስፋት",  // draft – needs native review
  "outlook.harvest": "የሚጠበቅ ስብሰባ",  // draft – needs native review
  "outlook.hidden": "ተደብቋል (ከ5 እርሻዎች በታች)",  // draft – needs native review
  "outlook.unknown": "አይታወቅም",  // draft – needs native review
  "outlook.estimated": "አንዳንድ ወራት ከሚኒስቴሩ የሰብል ቀን መቁጠሪያ የተገመቱ ናቸው።",  // draft – needs native review
  "outlook.none": "ለዚህ ሰብል እስካሁን የተመዘገበ የሰብል ወቅት የለም።",  // draft – needs native review

  // ── ABC and buy requests ──────────────────────────────────────────────────
  "nav.abc": "የእኔ ABC",  // draft – needs native review
  "role.abc_manager": "የABC ሥራ አስኪያጅ",  // draft – needs native review
  "role.abc_manager.desc": "የአርሶ አደሮች የግብርና ንግድ ኩባንያ (ABC) ሥራ አስኪያጅ። ከተቀበሉ አባላት ጋር ይሰራል፦ መዋጮዎች፣ የሰብል ዕቅድ፣ መልእክቶችና የገዢዎች ጥያቄዎች።",  // draft – needs native review
  "perm.abc_manage": "የራስን ABC ማስተዳደር",  // draft – needs native review
  "perm.abc_manage.desc": "አርሶ አደሮችን መጋበዝ፣ መዋጮዎችን መመዝገብ፣ ግብዓትና ምርት ስብሰባ ማቀድ፣ ለአባላት መልእክት መላክ፣ ለገዢዎች መመለስ።",  // draft – needs native review
  "perm.trade_request": "የግዢ ጥያቄዎችን መለጠፍ",  // draft – needs native review
  "perm.trade_request.desc": "ABCዎችን ሰብልና መጠን መጠየቅ፣ መልሶቻቸውንም ማንበብ።",  // draft – needs native review
  "abc.description": "የአባላትዎ እርሻዎችና ሰብሎች፣ መዋጮዎቻቸው፣ የግብዓትና የምርት ስብሰባ ዕቅድ፣ ለአባላት መልእክቶች እና የገዢዎች ጥያቄዎች።",  // draft – needs native review
  "abc.report": "ሪፖርት ለATI (CSV)",  // draft – needs native review
  "abc.members": "አባላት",  // draft – needs native review
  "abc.invited": "መቀበልን በመጠባበቅ ላይ",  // draft – needs native review
  "abc.area": "አሁን የሚለማ ስፋት",  // draft – needs native review
  "abc.contributions": "የመዋጮ መዝገቦች",  // draft – needs native review
  "abc.tab.members": "አባላት",  // draft – needs native review
  "abc.tab.contributions": "መዋጮዎች",  // draft – needs native review
  "abc.tab.planning": "ዕቅድ",  // draft – needs native review
  "abc.tab.messages": "መልእክቶች",  // draft – needs native review
  "abc.tab.buyers": "ገዢዎች",  // draft – needs native review
  "abc.membersHint": "የተመዘገቡ አርሶ አደሮችን በስልክ ይጋብዙ። የአርሶ አደሩ እርሻዎችና ሰብሎች ለABC የሚታዩት በመተግበሪያቸው ከተቀበሉ በኋላ ብቻ ነው።",  // draft – needs native review
  "abc.invitePhone": "የአርሶ አደሩ ስልክ ቁጥር",  // draft – needs native review
  "abc.invite": "ጋብዝ",  // draft – needs native review
  "abc.invitedOk": "ግብዣው ተልኳል። አርሶ አደሩ በመገለጫዬ ውስጥ ይቀበላል።",  // draft – needs native review
  "abc.noMembers": "እስካሁን አባል የለም።",  // draft – needs native review
  "abc.waiting": "በመጠባበቅ ላይ",  // draft – needs native review
  "abc.contributionsNote": "የባለአክሲዮን መዋጮዎች (መሬት፣ እንስሳት፣ ጉልበት)። በABC የሚያዝ መዝገብ ነው፤ ሕጋዊ ሰነድ አይደለም።",  // draft – needs native review
  "abc.kind.land": "መሬት",  // draft – needs native review
  "abc.kind.livestock": "እንስሳት",  // draft – needs native review
  "abc.kind.labour": "ጉልበት",  // draft – needs native review
  "abc.quantity": "መጠን",  // draft – needs native review
  "abc.unit": "መለኪያ",  // draft – needs native review
  "abc.add": "ጨምር",  // draft – needs native review
  "abc.byStage": "የአባላት ሰብሎች በደረጃ",  // draft – needs native review
  "abc.upcoming": "በሚቀጥሉት 3 ሳምንታት የሚጀምሩ ደረጃዎች",  // draft – needs native review
  "abc.upcomingHint": "ግብዓትና ጉልበትን አስቀድመው ያቅዱ፦ በቅርቡ ወደ እያንዳንዱ ደረጃ የሚገቡ እርሻዎችና ስፋት።",  // draft – needs native review
  "abc.quantitiesNote": "የግብዓት መጠኖች ገና አልተሰሉም፤ የሚኒስቴሩን የተረጋገጡ መጠኖች ይፈልጋሉ። የልማት ሰራተኛዎን ይጠይቁ።",  // draft – needs native review
  "abc.messagesHint": "ለ{n} አባላትዎ መልእክት ይላኩ። ማስጠንቀቂያዎችን ያጠፉ አባላት አይቀበሉትም፤ ሳምንታዊው ገደብም ይሰራል።",  // draft – needs native review
  "abc.send": "ለአባላት ላክ",  // draft – needs native review
  "abc.sent": "ለ{n} አባላት ተልኳል ({skipped} አልተላከም፦ ማስጠንቀቂያ ጠፍቷል ወይም ሳምንታዊ ገደብ ደርሷል)።",  // draft – needs native review
  "abc.buyersHint": "ለክልልዎ ከነጋዴዎች የመጡ ክፍት የግዢ ጥያቄዎች። መልስዎ ከABCዎ ስምና ስልክ ጋር ለነጋዴው ይደርሳል።",  // draft – needs native review
  "abc.noBuyers": "ክፍት የግዢ ጥያቄ የለም።",  // draft – needs native review
  "abc.answered": "ተመልሷል",  // draft – needs native review
  "abc.answerPlaceholder": "የእርስዎ ቅናሽ (መጠን፣ መቼ፣ የዋጋ ሀሳብ)",  // draft – needs native review
  "abcInv.title": "የእኔ ABC",  // draft – needs native review
  "abcInv.hint": "የጋበዙዎት የአርሶ አደሮች የግብርና ንግድ ኩባንያዎች። ከተቀበሉ ABC እርሻዎችዎንና የሰብል ወቅቶችዎን ማየት ይችላል።",  // draft – needs native review
  "abcInv.accept": "ተቀበል",  // draft – needs native review
  "abcInv.decline": "አትቀበል",  // draft – needs native review
  "abcInv.member": "አባል",  // draft – needs native review
  "abcInv.leave": "ውጣ",  // draft – needs native review
  "buy.title": "ለABCዎች የግዢ ጥያቄዎች",  // draft – needs native review
  "buy.hint": "ለአርሶ አደሮች የግብርና ንግድ ኩባንያዎች መግዛት የሚፈልጉትን ይንገሩ። በክልሉ ያሉ ABCዎች ከአድራሻቸው ጋር እዚህ ይመልሳሉ።",  // draft – needs native review
  "buy.quantity": "መጠን (ኩንታል)",  // draft – needs native review
  "buy.anyRegion": "ማንኛውም ክልል",  // draft – needs native review
  "buy.neededBy": "የሚያስፈልግበት ቀን",  // draft – needs native review
  "buy.post": "ጥያቄ ለጥፍ",  // draft – needs native review
  "buy.note": "ማስታወሻ (ጥራት፣ የማስረከቢያ ቦታ…)",  // draft – needs native review
  "buy.none": "እስካሁን ምንም ጥያቄ አልለጠፉም።",  // draft – needs native review
  "buy.open": "ክፍት",  // draft – needs native review
  "buy.closed": "ተዘግቷል",  // draft – needs native review
  "buy.noAnswers": "እስካሁን መልስ የለም።",  // draft – needs native review
  "abc.descField": "መግለጫ",  // draft – needs native review

  // ── Commercial farm ───────────────────────────────────────────────────────
  "nav.estate": "እርሻዬ (የንግድ)",  // draft – needs native review
  "role.farm_manager": "የንግድ እርሻ ሥራ አስኪያጅ",  // draft – needs native review
  "role.farm_manager.desc": "የንግድ እርሻ ሥራ አስኪያጅ ወይም የግብርና ባለሙያ። የእርሻውን ብሎኮች፣ የቅኝት መዝገቦችና የምርት ስብሰባ ዕቅድ ይጠብቃል።",  // draft – needs native review
  "perm.estate_manage": "የራስን የንግድ እርሻ ማስተዳደር",  // draft – needs native review
  "perm.estate_manage.desc": "ብሎኮችን መጨመር፣ ቅኝት መመዝገብ፣ በብሎኮቹ አቅራቢያ ያሉ የበሽታ ማስጠንቀቂያዎችን ማየት፣ የምርት ስብሰባ ዕቅድ ማውጣት።",  // draft – needs native review
  "estate.description": "የእርሻዎ ብሎኮች ከሰብል ደረጃና ከሚጠበቀው ስብሰባ ጋር፣ የቅኝት መዝገቦች፣ እና ከቅኝትና ከእያንዳንዱ ብሎክ አቅራቢያ ሪፖርቶች የሚመጡ የበሽታ ማስጠንቀቂያዎች።",  // draft – needs native review
  "estate.addBlock": "ብሎክ ጨምር",  // draft – needs native review
  "estate.blocks": "ብሎኮች",  // draft – needs native review
  "estate.block": "ብሎክ",  // draft – needs native review
  "estate.area": "በሰብል የተሸፈነ ስፋት",  // draft – needs native review
  "estate.alerts": "የበሽታ ማስጠንቀቂያዎች",  // draft – needs native review
  "estate.alertScouting": "ቅኝት {disease} አግኝቷል ({severity})",  // draft – needs native review
  "estate.alertNearby": "{disease} በዚህ ብሎክ አቅራቢያ በ{farms} እርሻዎች ሪፖርት ተደርጓል (በጣም ቅርብ {km} ኪ.ሜ)",  // draft – needs native review
  "estate.noBlocks": "እስካሁን ብሎክ የለም። የመጀመሪያ ማሳዎን ይጨምሩ።",  // draft – needs native review
  "estate.lastScouting": "የመጨረሻ ቅኝት",  // draft – needs native review
  "estate.scout": "ቅኝት መዝግብ",  // draft – needs native review
  "estate.estimated": "ከሰብል ቀን መቁጠሪያ የተገመተ",  // draft – needs native review
  "estate.team": "የእርሻ ቡድን",  // draft – needs native review
  "estate.teamHint": "የቡድን መለያዎች በአስተዳዳሪ ይጨመራሉ (የድርጅቶች ገጽ)።",  // draft – needs native review
  "estate.statusLabel": "ሁኔታ",  // draft – needs native review
  "estate.status.active": "እያደገ ነው",  // draft – needs native review
  "estate.status.harvested": "ተሰብስቧል",  // draft – needs native review
  "estate.status.fallow": "ጦም",  // draft – needs native review
  "estate.severity": "ምን አገኙ?",  // draft – needs native review
  "estate.sev.none": "ምንም",  // draft – needs native review
  "estate.sev.low": "ዝቅተኛ",  // draft – needs native review
  "estate.sev.medium": "መካከለኛ",  // draft – needs native review
  "estate.sev.high": "ከፍተኛ",  // draft – needs native review
  "estate.disease": "በሽታ",  // draft – needs native review
  "estate.incidence": "የተጠቁ ተክሎች (%)",  // draft – needs native review
  "estate.note": "ማስታወሻ",  // draft – needs native review

  // ── Regulator ─────────────────────────────────────────────────────────────
  "nav.regulator": "ተቆጣጣሪ (EAA)",  // draft – needs native review
  "role.regulator": "ተቆጣጣሪ (EAA)",  // draft – needs native review
  "role.regulator.desc": "የተቆጣጣሪ (EAA) ሰራተኛ። ይፋዊውን የተመዘገቡ ምርቶች ዝርዝር ያስገባል፤ የሀሰተኛ ምርት ሪፖርቶችንና የኮድ አሰጣጥን በሀገር ደረጃ ያያል።",  // draft – needs native review
  "perm.registry_manage": "የተመዘገቡ ምርቶችን መቆጣጠር",  // draft – needs native review
  "perm.registry_manage.desc": "ይፋዊውን የምርት ዝርዝር ማስገባት፣ የሀገር አቀፍ የሀሰተኛ ምርት ካርታና የአቅራቢዎች የኮድ አሰጣጥ ማየት።",  // draft – needs native review
  "regulator.description": "መድረኩ የሚጠቀምበት የተመዘገቡ ምርቶች ዝርዝር፣ የኮድ ማረጋገጫዎች የሚወድቁበት ወይም ሀሰተኛ ምርቶች ሪፖርት የሚደረጉበት ቦታ፣ እና እያንዳንዱ አቅራቢ ስንት ኮዶች እንደሚሰጥ።",  // draft – needs native review
  "regulator.tab.registry": "የተመዘገቡ ምርቶች",  // draft – needs native review
  "regulator.tab.counterfeits": "የሀሰተኛ ምርት ካርታ",  // draft – needs native review
  "regulator.tab.issuance": "የኮድ አሰጣጥ",  // draft – needs native review
  "regulator.registryHint": "ይፋዊውን ዝርዝር በCSV ያስገቡ (ከሚወርደው ጋር ተመሳሳይ ዓምዶች)። ምርቶች ይጨመራሉ ወይም ይዘመናሉ፤ በፍጹም አይሰረዙም፤ ረድፎች የተረጋገጡ የሚባሉት ፋይሉ ሲገልጽ ብቻ ነው።",  // draft – needs native review
  "regulator.import": "ይፋዊ ዝርዝር አስገባ",  // draft – needs native review
  "regulator.summary": "{total} ምርቶች፦ {registered} የተመዘገቡ፣ {banned} የታገዱ፤ {placeholder} ገና ከይፋዊው ዝርዝር ጋር አልተረጋገጡም።",  // draft – needs native review
  "regulator.status.registered": "የተመዘገበ",  // draft – needs native review
  "regulator.status.banned": "የታገደ",  // draft – needs native review
  "regulator.status.expired": "ጊዜው ያለፈ",  // draft – needs native review
  "regulator.notVerified": "ያልተረጋገጠ",  // draft – needs native review
  "regulator.counterfeitsHint": "ያለፉት {n} ቀናት፦ {warnings} የወደቁ የኮድ ማረጋገጫዎችና {fakes} የተጠረጠሩ ሀሰተኛ ሪፖርቶች፣ በወረዳ።",  // draft – needs native review
  "regulator.warningsLegend": "የወደቁ ማረጋገጫዎችና የሀሰተኛ ሪፖርቶች",  // draft – needs native review
  "regulator.fakeReports": "የሀሰተኛ ሪፖርቶች",  // draft – needs native review
  "regulator.noCounterfeits": "በዚህ ጊዜ ውስጥ የወደቀ ማረጋገጫ ወይም የሀሰተኛ ሪፖርት የለም።",  // draft – needs native review
  "regulator.issuanceHint": "በአቅራቢ፦ የተዘረዘሩ ምርቶች፣ የኮድ ስብስቦች፣ የተሸፈኑ እሽጎች፣ ማረጋገጫዎች፣ ማስጠንቀቂያዎችና መልሶች።",  // draft – needs native review

  // ── NGO projects ──────────────────────────────────────────────────────────
  "nav.ngo": "የNGO ፕሮጀክቶች",  // draft – needs native review
  "role.ngo_staff": "የNGO / ፕሮጀክት ሰራተኛ",  // draft – needs native review
  "role.ngo_staff.desc": "የNGO ወይም የልማት ፕሮጀክት ሰራተኛ። በተመረጡ ወረዳዎች ፕሮጀክቶችን ያካሂዳል፦ ለዚያ አርሶ አደሮች የምክር መልእክቶችና የተጠቃለሉ የውጤት ሪፖርቶች።",  // draft – needs native review
  "perm.ngo_manage": "የNGO ፕሮጀክቶችን ማካሄድ",  // draft – needs native review
  "perm.ngo_manage.desc": "ፕሮጀክቶችን መፍጠር፣ ወረዳዎቻቸውን መምረጥ፣ ወደዚያ የምክር መልእክቶች መላክ እና የተጠቃለለ ውጤት ማየት።",  // draft – needs native review
  "ngo.description": "ፕሮጀክቶችዎ፣ የሚሸፍኗቸው ወረዳዎች፣ ለዚያ አርሶ አደሮች የምክር መልእክቶች፣ እና እያንዳንዱ ፕሮጀክት ከጀመረ ወዲህ ያለው ውጤት። ድምሮች ብቻ ይታያሉ፤ ነጠላ አርሶ አደሮች በፍጹም አይታዩም።",  // draft – needs native review
  "ngo.new": "አዲስ ፕሮጀክት",  // draft – needs native review
  "ngo.start": "የመጀመሪያ ቀን",  // draft – needs native review
  "ngo.none": "እስካሁን ፕሮጀክት የለም።",  // draft – needs native review
  "ngo.since": "ከ{date} ጀምሮ",  // draft – needs native review
  "ngo.areas": "የፕሮጀክቱ ወረዳዎች",  // draft – needs native review
  "ngo.noAreas": "ይህ ፕሮጀክት የሚሸፍናቸውን ወረዳዎች ይጨምሩ።",  // draft – needs native review
  "ngo.addArea": "ወረዳ ጨምር",  // draft – needs native review
  "ngo.message": "በእነዚህ ወረዳዎች ላሉ አርሶ አደሮች የምክር መልእክት",  // draft – needs native review
  "ngo.messageHint": "የሚቀበሉት ማስጠንቀቂያ የፈቀዱ አርሶ አደሮች ብቻ ናቸው፤ ሳምንታዊው ገደብም ይሰራል።",  // draft – needs native review
  "ngo.sent": "በአካባቢው ካሉ {total} አርሶ አደሮች ለ{sent} ተልኳል።",  // draft – needs native review
  "ngo.impact": "ከጅምሩ ወዲህ ያለው ውጤት",  // draft – needs native review
  "ngo.improved": "ክትትል፦ ተሻሽሏል",  // draft – needs native review

  // ── Lenders (credit profile with consent) ─────────────────────────────────
  "nav.lender": "የብድር ጥያቄዎች",  // draft – needs native review
  "role.lender": "የባንክ / ማይክሮፋይናንስ ሰራተኛ",  // draft – needs native review
  "role.lender.desc": "የባንክ ወይም የማይክሮፋይናንስ ሰራተኛ። አርሶ አደሮች የብድር መረጃቸውን እንዲያጋሩ ይጠይቃል፤ የአርሶ አደሩን ሪፖርት የሚያየው አርሶ አደሩ በመተግበሪያው ካጸደቀ በኋላ ብቻ ነው።",  // draft – needs native review
  "perm.credit_request": "የአርሶ አደር የብድር መረጃ መጠየቅ",  // draft – needs native review
  "perm.credit_request.desc": "አርሶ አደሩ የብድር መረጃውን እንዲያጋራ መጠየቅ፣ እና ፈቃዱ እስካለ ድረስ ሪፖርቱን ማንበብ።",  // draft – needs native review
  "credit.description": "አርሶ አደሩ የብድር መረጃውን እንዲያጋራ ይጠይቁ። አርሶ አደሩ በመተግበሪያው እስኪያጸድቅ ድረስ ምንም አያዩም። ፈቃዱ ለ30 ቀናት ይቆያል፤ አርሶ አደሩ በማንኛውም ጊዜ ሊያነሳው ይችላል።",  // draft – needs native review
  "credit.new": "አዲስ ጥያቄ",  // draft – needs native review
  "credit.newHint": "የአርሶ አደሩን ስልክ ቁጥርና የሚጠይቁበትን ምክንያት ያስገቡ። አርሶ አደሩ ስምዎንና ይህን ምክንያት ያያል።",  // draft – needs native review
  "credit.phone": "የአርሶ አደሩ ስልክ",  // draft – needs native review
  "credit.purpose": "ምክንያት (ለምሳሌ፦ ለመኸር ወቅት የግብዓት ብድር)",  // draft – needs native review
  "credit.send": "ጥያቄ ላክ",  // draft – needs native review
  "credit.sent": "ተልኳል። ይህ ቁጥር የተመዘገበ አርሶ አደር ከሆነ ጥያቄዎን በመተግበሪያው ያያል።",  // draft – needs native review
  "credit.mine": "የእኔ ጥያቄዎች",  // draft – needs native review
  "credit.none": "እስካሁን ጥያቄ የለም።",  // draft – needs native review
  "credit.status.not_shared": "አልተጋራም",  // draft – needs native review
  "credit.status.pending": "በመጠባበቅ ላይ",  // draft – needs native review
  "credit.status.declined": "ተቀባይነት አላገኘም",  // draft – needs native review
  "credit.status.approved": "ተጋርቷል",  // draft – needs native review
  "credit.status.expired": "ጊዜው አልፏል",  // draft – needs native review
  "credit.status.revoked": "ተነስቷል",  // draft – needs native review
  "credit.open": "ሪፖርቱን ክፈት",  // draft – needs native review
  "credit.hide": "ሪፖርቱን ደብቅ",  // draft – needs native review
  "credit.privacy": "\"አልተጋራም\" ማለት አርሶ አደሩ ገና አልመለሰም፣ እምቢ ብሏል፣ ወይም ቁጥሩ አልተመዘገበም ሊሆን ይችላል። የሚከፍቱት እያንዳንዱ ሪፖርት በኦዲት መዝገቡ ይመዘገባል።",  // draft – needs native review
  "credit.score": "ውጤት {score} / 100",  // draft – needs native review
  "credit.farms": "{count} ማሳ(ዎች)፣ {area} ሄክታር። ሰብሎች፦ {crops}",  // draft – needs native review
  "credit.validUntil": "እስከ {date} ተጋርቷል",  // draft – needs native review
  "credit.method": "ከአርሶ አደሩ የራሱ የመድረክ መዝገቦች በህግ የተሰላ ውጤት (AI አይደለም)። የብድር ውሳኔ አይደለም።",  // draft – needs native review
  "creditInv.title": "የብድር መረጃ ጥያቄዎች",  // draft – needs native review
  "creditInv.hint": "እነዚህ ባንኮች ወይም ማይክሮፋይናንስ ተቋማት የብድር መረጃዎን (ውጤት፣ ማሳዎችና ሰብሎች፣ ስምና ስልክ) ለማየት ጠይቀዋል። ካጸደቁ ለ30 ቀናት ማየት ይችላሉ። በማንኛውም ጊዜ ማንሳት ይችላሉ።",  // draft – needs native review
  "creditInv.approve": "አጋራ",  // draft – needs native review
  "creditInv.sharedUntil": "እስከ {date} ተጋርቷል",  // draft – needs native review
  "creditInv.revoke": "ማጋራት አቁም",  // draft – needs native review

  // ── Offline mode ──────────────────────────────────────────────────────────
  "offline.offline": "ከመስመር ውጭ ነዎት።",  // draft – needs native review
  "offline.savedCopy": "በዚህ ስልክ ላይ የተቀመጠውን የመጨረሻ መረጃ እያዩ ነው።",  // draft – needs native review
  "offline.waiting": "{n} ለመላክ እየጠበቁ ነው። እስኪላኩ ድረስ ከመለያዎ አይውጡ።",  // draft – needs native review
  "offline.sent": "{n} ተልከዋል። መልሶች በአማካሪው፣ የፎቶ ውጤቶች በሰብል ጤና ውስጥ ናቸው።",  // draft – needs native review
  "offline.notSent": "አልተላከም፦ {message}",  // draft – needs native review
  "offline.dismiss": "እሺ",  // draft – needs native review
  "offline.queuedQuestion": "ግንኙነት የለም። ጥያቄዎ በዚህ ስልክ ላይ ተቀምጧል፤ ግንኙነት ሲመለስ ይላካል።",  // draft – needs native review
  "offline.queuedPhoto": "ግንኙነት የለም። ፎቶዎ በዚህ ስልክ ላይ ተቀምጧል፤ ግንኙነት ሲመለስ ይመረመራል። ውጤቱ ከታች ይታያል።",  // draft – needs native review
  "offline.savedChecks": "በዚህ ስልክ ላይ ያሉ የቅርብ ጊዜ የፎቶ ምርመራዎች",  // draft – needs native review
  "offline.savedChecksHint": "ያለ ግንኙነት ምክሩን ማንበብ እንዲችሉ እዚህ ተቀምጠዋል። ከመለያዎ ሲወጡ ይሰረዛሉ።",  // draft – needs native review
  "offline.noDisease": "የፎቶ ምርመራ",  // draft – needs native review
  "offline.open": "ክፈት",  // draft – needs native review

  // ── Training photo dataset ────────────────────────────────────────────────
  "consent.training": "የበሽታ ምርመራውን ለማሻሻል የሰብል ፎቶዎቼ ይቀመጡ",  // draft – needs native review
  "consent.trainingHint": "ፎቶዎችዎ ያለ ስምዎ፣ ስልክዎ ወይም አካባቢዎ ይቀመጣሉ፤ የበሽታ ሞዴሉን ለማሰልጠን ብቻ ያገለግላሉ። ይህን ካጠፉ ፎቶዎችዎ ከመረጃ ስብስቡ ይሰረዛሉ (አስቀድሞ በእነሱ የሰለጠነ ሞዴል ሊቀየር አይችልም)።",  // draft – needs native review
  "consent.kind.training": "ለስልጠና የሚውሉ ፎቶዎች",  // draft – needs native review
  "signup.consentTraining": "የበሽታ ምርመራውን ለማሻሻል የሰብል ፎቶዎቼ ይቀመጡ (አማራጭ)",  // draft – needs native review
  "da.consentTrainingAsk": "አርሶ አደሩ የሰብል ፎቶዎቹ የበሽታ ምርመራውን ለማሻሻል እንዲቀመጡ ይስማማል",  // draft – needs native review
  "photo.fromGallery": "ከጋለሪ ምረጥ",  // draft – needs native review
  "review.tab.dataset": "የስልጠና መረጃ ስብስብ",  // draft – needs native review
  "dataset.description": "የበሽታ ሞዴሉን እንደገና ለማሰልጠን በአርሶ አደሮች ፈቃድ የተቀመጡ የሰብል ፎቶዎች። ስም፣ ስልክ ወይም የGPS ነጥብ የለም፤ የፎቶ ሜታዳታ ይወገዳል።",  // draft – needs native review
  "dataset.exportLabelled": "የተሰየሙትን አውጣ (ZIP)",  // draft – needs native review
  "dataset.exportAll": "ሁሉንም አውጣ (ZIP)",  // draft – needs native review
  "dataset.included": "በመረጃ ስብስቡ ያሉ ፎቶዎች",  // draft – needs native review
  "dataset.labelled": "የተሰየሙ",  // draft – needs native review
  "dataset.excluded": "የተገለሉ",  // draft – needs native review
  "dataset.farmers": "የተስማሙ አርሶ አደሮች",  // draft – needs native review
  "dataset.byModel": "ሞዴሉ ያለው",  // draft – needs native review
  "dataset.bySource": "የተነሳበት",  // draft – needs native review
  "dataset.filter.all": "ሁሉም",  // draft – needs native review
  "dataset.filter.unlabelled": "ያልተሰየሙ",  // draft – needs native review
  "dataset.filter.labelled": "የተሰየሙ",  // draft – needs native review
  "dataset.filter.excluded": "የተገለሉ",  // draft – needs native review
  "dataset.none": "እስካሁን እዚህ ፎቶ የለም።",  // draft – needs native review
  "dataset.noneHint": "የተስማሙ አርሶ አደሮች የፎቶ ምርመራ ሲያደርጉ ፎቶዎች ይመጣሉ።",  // draft – needs native review
  "dataset.labelHint": "ለስልጠና የሚውለው ስያሜ እርስዎ ካስቀመጡ የእርስዎ ነው፤ ካልሆነ የልማት ሰራተኛው ማረጋገጫ። የሞዴሉ መልስ ትንበያ ብቻ ነው።",  // draft – needs native review
  "dataset.byAgronomist": "አግሮኖሚስት",  // draft – needs native review
  "dataset.byDa": "የልማት ሰራተኛ",  // draft – needs native review
  "dataset.model": "ሞዴል",  // draft – needs native review
  "dataset.reason": "ምክንያት (ለምሳሌ፦ ደብዛዛ)",  // draft – needs native review
  "dataset.exclude": "አግልል",  // draft – needs native review
  "dataset.include": "እንደገና አካትት",  // draft – needs native review
  "dataset.pickLabel": "ትክክለኛውን ስያሜ ይምረጡ",  // draft – needs native review
  "dataset.saveLabel": "ስያሜ አስቀምጥ",  // draft – needs native review

  // ── Daily tips ────────────────────────────────────────────────────────────
  "nav.tips": "ዕለታዊ ምክሮች",  // draft – needs native review
  "tips.today": "የዛሬ የእርሻ ምክር",  // draft – needs native review
  "tips.from": "የቅርብ ጊዜ ምክሮች፣ ከ{date}",  // draft – needs native review
  "tips.all": "ሁሉም ምክሮች",  // draft – needs native review
  "tips.description": "ከግብርና ሚኒስቴር መመሪያዎች የተወሰዱ አጫጭር የእርሻ ምክሮች፤ ከመታተማቸው በፊት በአግሮኖሚስት ይረጋገጣሉ።",  // draft – needs native review
  "tips.none": "እስካሁን የታተመ ምክር የለም።",  // draft – needs native review
  "tips.englishOnly": "በእንግሊዝኛ ታይቷል፦ ትርጉሙ ገና አልተዘጋጀም።",  // draft – needs native review
  "review.tab.tips": "ዕለታዊ ምክሮች",  // draft – needs native review
  "tips.reviewHint": "በየማለዳው ስርዓቱ የነገውን ምክሮች ከግብርና ሚኒስቴር መመሪያዎች (AI ከሌለ ከሰብል ካሌንደር) ያረቅቃል። እርስዎ እስኪያጸድቁ ድረስ ምንም አይታተምም። ከማጽደቅዎ በፊት እያንዳንዱን ቋንቋ ይፈትሹ።",  // draft – needs native review
  "tips.drafted": "ለ{date} {n} አዲስ ረቂቅ(ቆች)።",  // draft – needs native review
  "tips.draftNow": "አሁን ምክሮችን አርቅቅ",  // draft – needs native review
  "tips.write": "ምክር ጻፍ",  // draft – needs native review
  "tips.status.draft": "ግምገማ በመጠበቅ ላይ",  // draft – needs native review
  "tips.status.approved": "ታትሟል",  // draft – needs native review
  "tips.status.rejected": "ውድቅ ተደርጓል",  // draft – needs native review
  "tips.noneHere": "እዚህ ምንም የለም።",  // draft – needs native review
  "tips.origin.ai": "የAI ረቂቅ",  // draft – needs native review
  "tips.origin.calendar": "የሰብል ካሌንደር",  // draft – needs native review
  "tips.origin.expert": "በባለሙያ የተጻፈ",  // draft – needs native review
  "tips.national": "መላ ሀገሪቱ",  // draft – needs native review
  "tips.missingLangs": "የጎደለ፦ {langs}። እነዚህ አንባቢዎች የእንግሊዝኛውን ጽሑፍ ያያሉ።",  // draft – needs native review
  "tips.approve": "አጽድቅና አትም",  // draft – needs native review
  "tips.reject": "ውድቅ አድርግ",  // draft – needs native review
  "tips.edit": "አስተካክል",  // draft – needs native review
  "tips.aud.all": "ሁሉም",  // draft – needs native review
  "tips.date": "ቀን",  // draft – needs native review
  "tips.region": "የክልል ኮድ (ባዶ = መላ ሀገሪቱ)",  // draft – needs native review
  "tips.audience": "ማን ያየዋል",  // draft – needs native review
  "tips.title": "ርዕስ",  // draft – needs native review
  "tips.text": "ጽሑፍ",  // draft – needs native review
  "tips.editorHint": "መመሪያዎቹ የሚሉትን ብቻ ይጻፉ። የፀረ-ተባይ ምርት ወይም መጠን በፍጹም አይጻፉ። የAI ረቂቅን ሲያስተካክሉ [S1] ምልክቶቹን ይተዉ። \"አስቀምጥና አትም\" ምክሩን ወዲያውኑ ለሁሉም ያሳያል፤ \"በረቂቅ አስቀምጥ\" ለግምገማ ያቆየዋል።",  // draft – needs native review
  "tips.save": "አስቀምጥ",  // draft – needs native review
  "tips.cancel": "ተው",  // draft – needs native review

  // ── Sign-in demo accounts ─────────────────────────────────────────────────
  "signin.demoHint": "የማቅረቢያ አካባቢ፤ ናሙና ሰዎችና መዛግብት ይዟል። ለመግባት መለያ ይንኩ።",  // draft – needs native review
  "signin.demoPassword": "የይለፍ ቃል",  // draft – needs native review
  "signin.demo.pitchFarmer": "የማሳያው አርሶ አደር፣ ደዋ ጨፋ",  // draft – needs native review
  "signin.demo.farmerCases": "የልማት ሰራተኛ ጉዳዮች ያሉት አርሶ አደር",  // draft – needs native review
  "signin.demo.oromiaFarmer": "በኦሮሚያ ያለ አርሶ አደር (አፋን ኦሮሞ)",  // draft – needs native review

  // ── Admin daily tips ──────────────────────────────────────────────────────
  "nav.adminTips": "ምክሮችን አትም",  // draft – needs native review
  "tips.adminDescription": "ምክር ጽፈው ለአርሶ አደሮች፣ ለልማት ሰራተኞችና ለሌሎች ተጠቃሚዎች ያትሙ፤ ወይም ስርዓቱ በየማለዳው ከግብርና ሚኒስቴር መመሪያዎች የሚያዘጋጃቸውን ረቂቆች ያጽድቁ።",  // draft – needs native review
  "tips.savePublish": "አስቀምጥና አትም",  // draft – needs native review
  "tips.saveDraft": "በረቂቅ አስቀምጥ",  // draft – needs native review
  "tips.manage": "ምክር ጻፍ ወይም አጽድቅ",  // draft – needs native review

  // ── AI engine choice (Gemini / DeepSeek) ──────────────────────────────────
  "aikeys.engine.title": "የጽሑፍ መልሶች ሞተር",  // draft – needs native review
  "aikeys.engine.description": "የአማካሪውን መልሶች፣ ዕለታዊ ምክሮችንና አጫጭር ማብራሪያዎችን የትኛው AI እንደሚጽፍ ይምረጡ። ደንቦቹ አይቀየሩም፦ መልሶች ከመመሪያዎቹ ብቻ፣ ከምንጭ ጋር፣ የግል መረጃ አይላክም።",  // draft – needs native review
  "aikeys.engine.geminiHint": "ለድምፅና ለእውቀት ቋት ፍለጋም ያገለግላል። ነፃ ደረጃ አለው።",  // draft – needs native review
  "aikeys.engine.deepseekHint": "ጽሑፍ ብቻ፤ በቅድመ ክፍያ ሂሳብ በአጠቃቀም ይከፈላል። መረጃው በቻይና በሚገኙ የDeepSeek አገልጋዮች ይሰራል፤ ለGemini የሚላከውን ተመሳሳይ ስም-አልባ ጽሑፍ ይቀበላል።",  // draft – needs native review
  "aikeys.engine.inUse": "በጥቅም ላይ",  // draft – needs native review
  "aikeys.engine.use": "ይህን ተጠቀም",  // draft – needs native review
  "aikeys.engine.keys": "{n} የሚሰሩ ቁልፍ(ፎች)",  // draft – needs native review
  "aikeys.engine.fallbackOn": "የተመረጠው ሞተር ካልሰራ፣ ሌላው የሚሰራ ቁልፍ ካለው ይመልሳል (በምክር ቅንብሮች ገጽ ላይ ይቀየራል)።",  // draft – needs native review
  "aikeys.engine.fallbackOff": "ወደ ሌላው ሞተር መቀየር ጠፍቷል (የምክር ቅንብሮች ገጽ)።",  // draft – needs native review
  "aikeys.engine.geminiOnly": "ድምፅና የእውቀት ቋት ፍለጋ ሁልጊዜ Geminiን ይጠቀማሉ፤ ስለዚህ ቢያንስ አንድ የGemini ቁልፍ ያስቀምጡ።",  // draft – needs native review
  "aikeys.engine.saved": "አሁን መልሶቹን {name} ይጽፋል።",  // draft – needs native review
  "aikeys.engine.noKey": "{name} ተመርጧል ነገር ግን እስካሁን የሚሰራ ቁልፍ የለውም። ቁልፍ ይጨምሩ፤ እስከዚያው መቀየሩ ከበራ ሌላው ሞተር ይመልሳል።",  // draft – needs native review
  "aikeys.providerKeys": "የ{name} ቁልፎች",  // draft – needs native review
  "aikeys.provider": "አቅራቢ",  // draft – needs native review
  "aikeys.getGemini": "በaistudio.google.com/apikey ቁልፍ ይፍጠሩ። ከተለያዩ የGoogle ፕሮጀክቶች የተገኙ ቁልፎች የተለያየ ገደብ አላቸው።",  // draft – needs native review
  "aikeys.getDeepseek": "በplatform.deepseek.com (API keys) ቁልፍ ይፍጠሩና እዚያው ሂሳብ ይሙሉ። ሂሳብ የሌለው ቁልፍ ይዘለላል።",  // draft – needs native review
  "settings.llm_fallback": "የተመረጠው AI ሞተር ካልሰራ ሌላውን ተጠቀም",  // draft – needs native review
  "settings.llm_fallback.hint": "በርቷል፦ የተመረጠው ሞተር (Gemini ወይም DeepSeek) ቁልፍ ወይም ሂሳብ ከሌለው ወይም ከተቋረጠ፣ ሌላው የሚሰራ ቁልፍ ካለው ይመልሳል። ሞተሩ የሚመረጠው በAI API ቁልፎች ገጽ ላይ ነው።",  // draft – needs native review
  "settings.daily_tips_auto": "በየማለዳው ዕለታዊ ምክሮችን አርቅቅ",  // draft – needs native review
  "settings.daily_tips_auto.hint": "በርቷል፦ በየማለዳው ስርዓቱ የነገውን ምክሮች ለግምገማ ያረቅቃል። አግሮኖሚስት ወይም አስተዳዳሪ እስኪያጸድቅ ድረስ ምንም አይታተምም።",  // draft – needs native review
  "settings.daily_tips_per_day": "በቀን የሚረቀቁ ምክሮች",  // draft – needs native review
  "settings.daily_tips_per_day.hint": "እያንዳንዱ የAI ረቂቅ አንድ የAI ጥያቄ ይጠቀማል።",  // draft – needs native review

  // ── DeepSeek key list ─────────────────────────────────────────────────────
  "aikeys.noneHintDeepseek": "አንድ እስኪጨምሩ ድረስ DeepSeek ሊጠቀም የሚችለው በአገልጋዩ .env ፋይል ውስጥ ያለውን DEEPSEEK_API_KEY ብቻ ነው፣ ከተቀመጠ።",  // draft – needs native review

  // ── Sidebar groups ────────────────────────────────────────────────────────
  "nav.group.farming": "እርሻ",  // draft – needs native review
  "nav.group.extension": "የኤክስቴንሽን ስራ",  // draft – needs native review
  "nav.group.partners": "የአጋሮች መግቢያዎች",  // draft – needs native review
  "nav.group.contentAi": "ይዘትና AI",  // draft – needs native review
  "nav.group.system": "ስርዓት",  // draft – needs native review

  // ── Livestock prices ──────────────────────────────────────────────────────
  "nav.livestock": "የእንስሳት ዋጋ",  // draft – needs native review
  "lv.description": "በNMIS የእንስሳት ገበያዎች የተዘገበ የአንድ እንስሳ ዋጋ፣ ከ4 ሳምንት ግምትና ምን ያህል እርግጠኛ እንደሆነ ጋር።",  // draft – needs native review
  "lv.animal": "እንስሳ",  // draft – needs native review
  "lv.animal.ox": "በሬ",  // draft – needs native review
  "lv.animal.cow": "ላም",  // draft – needs native review
  "lv.animal.bull": "ኮርማ",  // draft – needs native review
  "lv.animal.heifer": "ጊደር",  // draft – needs native review
  "lv.animal.calf": "ጥጃ",  // draft – needs native review
  "lv.animal.sheep": "በግ",  // draft – needs native review
  "lv.animal.goat": "ፍየል",  // draft – needs native review
  "lv.animal.camel": "ግመል",  // draft – needs native review
  "lv.animal.chicken": "ዶሮ",  // draft – needs native review
  "lv.sourceLine": "ምንጭ፦ የNMIS የእንስሳት ገበያ መረጃ፣ ከ{start} እስከ {end}።",  // draft – needs native review
  "lv.stat.reports": "የዋጋ ሪፖርቶች",  // draft – needs native review
  "lv.stat.markets": "ገበያዎች",  // draft – needs native review
  "lv.stat.period": "የመረጃ ጊዜ",  // draft – needs native review
  "lv.stat.days": "{n} ቀናት",  // draft – needs native review
  "lv.empty.title": "ገና የእንስሳት ዋጋ አልተጫነም",  // draft – needs native review
  "lv.empty.description": "የNMIS የእንስሳት ገበያ ሪፖርቶች ሲገቡ ዋጋዎች እዚህ ይታያሉ።",  // draft – needs native review
  "lv.noSeries": "ለዚህ ምርጫ ሪፖርት የለም።",  // draft – needs native review
  "lv.outlook.title": "የ4 ሳምንት ግምት",  // draft – needs native review
  "lv.outlook.country": "መላ አገሪቱ፣ ሁሉም ደረጃዎች በአንድ",  // draft – needs native review
  "lv.outlook.region": "{region}፣ ሁሉም ደረጃዎች በአንድ",  // draft – needs native review
  "lv.outlook.countryFallback": "በ{region} ሪፖርቶች ጥቂት ናቸው፤ የመላ አገሪቱ ግምት",  // draft – needs native review
  "lv.outlook.up": "ዋጋ በ{pct}% ገደማ ሊጨምር ይችላል",  // draft – needs native review
  "lv.outlook.down": "ዋጋ በ{pct}% ገደማ ሊቀንስ ይችላል",  // draft – needs native review
  "lv.outlook.flat": "ዋጋ ብዙም ላይለወጥ ይችላል",  // draft – needs native review
  "lv.outlook.range": "(ምናልባት ከ{low}% እስከ {high}%)",  // draft – needs native review
  "lv.outlook.none": "ገና ግምት የለም፤ አዝማሚያ ለመለካት መረጃው በቂ አይደለም።",  // draft – needs native review
  "lv.outlook.why": "ለምን ይህ የእምነት ደረጃ",  // draft – needs native review
  "lv.outlook.note": "እያንዳንዱ ደረጃ በእያንዳንዱ ገበያ የራሱ የዋጋ ደረጃ አለው፤ ሞዴሉ የጋራ አዝማሚያውን ይለካል። ግምት ቃል ኪዳን አይደለም፤ ከመሸጥዎ በፊት ገበያ ላይ ያረጋግጡ።",  // draft – needs native review
  "lv.conf.high": "ከፍተኛ እምነት",  // draft – needs native review
  "lv.conf.medium": "መካከለኛ እምነት",  // draft – needs native review
  "lv.conf.low": "ዝቅተኛ እምነት",  // draft – needs native review
  "lv.reason.period": "ከ{start} እስከ {end} ከ{markets} ገበያ(ዎች) በተገኙ {reports} የዋጋ ሪፖርቶች ላይ የተመሰረተ።",  // draft – needs native review
  "lv.reason.no_season": "መረጃው ከአንድ ዓመት በታች ስለሆነ የወቅት ለውጦች (በዓላት፣ ደረቅ ወቅት) በሞዴሉ ውስጥ የሉም።",  // draft – needs native review
  "lv.reason.few_reports": "{reports} ሪፖርቶች ብቻ ናቸው፤ አንድ ያልተለመደ የገበያ ቀን ውጤቱን ሊለውጥ ይችላል።",  // draft – needs native review
  "lv.reason.short_period": "የ{days} ቀናት መረጃ ብቻ ነው፤ አዝማሚያን ከጊዜያዊ ለውጥ ለመለየት በጣም አጭር ነው።",  // draft – needs native review
  "lv.reason.stale": "የመጨረሻው ሪፖርት የ{days} ቀናት ዕድሜ አለው።",  // draft – needs native review
  "lv.reason.checked": "ባላያቸው የቅርብ ሪፖርቶች ላይ ተፈትኗል፦ በአማካይ በ{pct}% ተሳስቷል ('ለውጥ የለም' ብሎ መገመት በ{naive}% ተሳስቷል)።",  // draft – needs native review
  "lv.reason.no_trend": "በቅርብ ሪፖርቶች ላይ አዝማሚያው ({pct}% ስህተት) 'ለውጥ የለም' ከሚለው ግምት ({naive}%) የተሻለ ስላልሆነ ግምቱ 'ብዙም አይለወጥም' ነው።",  // draft – needs native review
  "lv.reason.not_checked": "ሞዴሉን ባላየው መረጃ ለመፈተን የቅርብ ሪፖርቶች በጣም ጥቂት ናቸው።",  // draft – needs native review
  "lv.reason.too_few": "አዝማሚያ ለማየት በተመሳሳይ ገበያ የተመሳሳይ ደረጃ ተደጋጋሚ ሪፖርቶች በቂ አይደሉም።",  // draft – needs native review
  "lv.reason.no_data": "ለዚህ እንስሳ የተጫነ ሪፖርት የለም።",  // draft – needs native review
  "lv.chart.title": "የአንድ እንስሳ አማካይ ዋጋ",  // draft – needs native review
  "lv.chart.description": "የዝቅተኛውና የከፍተኛው ዋጋ መካከለኛ፤ በቅርቡ የተዘገቡ {n} ደረጃዎች።",  // draft – needs native review
  "lv.table.title": "የቅርብ ጊዜ ዋጋዎች",  // draft – needs native review
  "lv.table.description": "ለአንድ እንስሳ፣ ከዝቅተኛ እስከ ከፍተኛ የተዘገበ ዋጋ። ግምት፦ ከመጨረሻው ሪፖርት 4 ሳምንታት በኋላ የሚጠበቀው ክልል።",  // draft – needs native review
  "lv.table.market": "ገበያ",  // draft – needs native review
  "lv.table.grade": "ደረጃ",  // draft – needs native review
  "lv.table.latest": "የቅርብ ዋጋ",  // draft – needs native review
  "lv.table.date": "የተዘገበበት",  // draft – needs native review
  "lv.table.change": "ካለፈው ጀምሮ",  // draft – needs native review
  "lv.table.outlook": "በ4 ሳምንት",  // draft – needs native review
  "lv.import.title": "የእንስሳት ዋጋ አስገባ",  // draft – needs native review
  "lv.import.description": "የNMIS የእንስሳት ዋጋ ሪፖርቶችን CSV ይጫኑ (ለአምዶቹ ቅጹን ያውርዱ)። የተጫኑ ሪፖርቶች ይዘመናሉ፣ ግምቱም እንደገና ይሰለጥናል።",  // draft – needs native review
  "lv.import.template": "ቅጹን አውርድ",  // draft – needs native review
  "lv.import.upload": "CSV ጫን",  // draft – needs native review
  "lv.import.retrain": "ግምቱን እንደገና አሰልጥን",  // draft – needs native review
  "lv.import.result": "{added} ሪፖርቶች ተጨመሩ፣ {updated} ተዘመኑ፣ {rejected} ውድቅ ሆኑ፤ {forecasts} ግምቶች ሰለጠኑ።",  // draft – needs native review
  "lv.import.trained": "{trained} ሞዴሎች እንደገና ሰለጠኑ፤ {forecasts} ለግምት በቂ መረጃ አላቸው።",  // draft – needs native review
};
