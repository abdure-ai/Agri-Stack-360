// i18n/ti.ts — Tigrinya (ትግርኛ). DRAFT translation: needs review by a native speaker.
// Keys must match en.ts exactly (TypeScript checks it); keep {placeholders} unchanged.
import type { MessageKey } from "./en";

export const ti: Record<MessageKey, string> = {

  // ── App & shared ───────────────────────────────────────────────────────────
  "app.name": "Agri-Stack 360",
  "app.home": "መእተዊ ገጽ Agri-Stack 360",
  "lang.label": "ቋንቋ",
  "lang.choose": "ቋንቋ ምረጹ",
  "common.loading": "ይጽዕን ኣሎ…",
  "common.cancel": "ሰርዝ",
  "common.confirm": "ኣረጋግጽ",
  "common.save": "ዓቅብ",
  "common.saveChanges": "ለውጥታት ዓቅብ",
  "common.saving": "ይዕቀብ ኣሎ…",
  "common.close": "ዕጾ",
  "common.edit": "ኣመሓይሽ",
  "common.delete": "ደምስስ",
  "common.add": "ወስኽ",
  "common.back": "ተመለስ",
  "common.next": "ዝቕጽል",
  "common.search": "ድለ",
  "common.retry": "ደጊምኩም ፈትኑ",
  "common.refresh": "ኣሐድስ",
  "common.all": "ኩሉ",
  "common.none": "የለን",
  "common.yes": "እወ",
  "common.no": "ኣይኮነን",
  "common.optional": "ኣማራጺ",
  "common.required": "ኣድላዪ",
  "common.home": "መእተዊ",
  "common.you": "ንስኹም",
  "common.actions": "ተግባራት",
  "common.status": "ኩነታት",
  "common.name": "ስም",
  "common.phone": "ቴሌፎን",
  "common.region": "ክልል",
  "common.zone": "ዞባ",
  "common.woreda": "ወረዳ",
  "common.date": "ዕለት",
  "common.total": "ጠቕላላ",
  "common.active": "ንጡፍ",
  "common.inactive": "ዘይንጡፍ",
  "common.unknown": "ዘይፍለጥ",
  "common.notSet": "ኣይተመልአን",
  "common.showMore": "ተወሳኺ ኣርኢ",
  "common.showLess": "ውሑድ ኣርኢ",
  "common.download": "ኣውርድ",
  "common.exportCsv": "CSV ኣውርድ",
  "common.viewAll": "ኩሉ ርአ",
  "common.demoData": "ኣመላኻቲ ሓበሬታ",  // draft – needs native review
  "common.toggleSidebar": "ናይ ጎኒ ዝርዝር ክፈት/ዕጾ",
  "common.mainNavigation": "ቀንዲ መምርሒ",
  "common.breadcrumb": "መንገዲ ገጽ",
  "common.toggleTheme": "ብሩህ / ጸልማት ቀይር",
  "state.somethingWrong": "ገለ ጸገም ተፈጢሩ",
  "state.somethingWrongDot": "ገለ ጸገም ተፈጢሩ።",
  "state.checkingAccount": "ሕሳብኩም የረጋግጽ ኣሎ…",
  "error.unreachable": "ምስ {service} ክራኸብ ኣይተኻእለን። ይሰርሕ ምህላዉ ኣረጋግጹ እሞ ደጊምኩም ፈትኑ።",
  "service.server": "እቲ ሰርቨር",
  "service.platform": "ሰርቨር Agri-Stack",
  "service.market": "ኣገልግሎት ሓበሬታ ዕዳጋ",
  "service.forecast": "ኣገልግሎት ትንበያ",
  "service.sync": "ኣገልግሎት ምስምማዕ ሓበሬታ",
  "notFound.title": "እቲ ገጽ ኣይተረኽበን",
  "notFound.description": "እዚ ገጽ የለን",
  "notFound.error": "ጌጋ",
  "notFound.message": "እትደልይዎ ገጽ ክንረክቦ ኣይከኣልናን።",
  "notFound.back": "ናብ ዳሽቦርድ ተመለስ",

  // ── Navigation ─────────────────────────────────────────────────────────────
  "nav.menu": "ዝርዝር",
  "nav.account": "ሕሳብ",
  "nav.userManagement": "ምምሕዳር ተጠቀምቲ",
  "nav.administration": "ምምሕዳር",
  "nav.dashboard": "ዳሽቦርድ",
  "nav.market": "ሓበሬታ ዕዳጋ",
  "nav.cropHealth": "ጥዕና ዘርእቲ",
  "nav.inputs": "ኣቕረብቲ እታዋት",
  "nav.financial": "ፋይናንስ",
  "nav.advisory": "ምኽሪ AI",
  "nav.profile": "መግለጺ ርእሰይ",
  "nav.users": "ተጠቀምቲ",
  "nav.roles": "ተራታት",
  "nav.permissions": "ፍቓዳት",
  "nav.dataSync": "ምስምማዕ ሓበሬታ",
  "nav.knowledge": "ማእከል ፍልጠት",
  "header.profileFarms": "መግለጺ ርእሰይን ግራውተይን",
  "header.signOut": "ውጻእ",

  // ── Roles ──────────────────────────────────────────────────────────────────
  "role.farmer": "ሓረስታይ",
  "role.agent": "ሰራሕተኛ ልምዓት",
  "role.trader": "ነጋዳይ",
  "role.admin": "ኣመሓዳሪ",

  // ── Layout ─────────────────────────────────────────────────────────────
  "sidebar.dataNote": "ዋጋታት ዕዳጋ ካብ ሃገራዊ ስርዓት ሓበሬታ ዕዳጋ (NMIS) ዝመጹ እዮም፤ Agri-Stack 360 መዓልታዊ የሐድሶም።",

  // ── Glossary: crops, regions, units, categories, months ────────────────
  "crop.avocado": "ኣቮካዶ",
  "crop.banana": "ባናና",
  "crop.bean": "ፋጁሊ",
  "crop.garlic": "ጻዕዳ ሽጉርቲ",
  "crop.green_mung": "ማሾ",
  "crop.local_rice": "ናይ ዓዲ ሩዝ",
  "crop.maize": "ዕፉን",
  "crop.malt_barely": "ናይ ቢራ ስገም",
  "crop.malt_barley": "ናይ ቢራ ስገም",
  "crop.barley": "ስገም",
  "crop.mango": "ማንጎ",
  "crop.onion": "ቀይሕ ሽጉርቲ",
  "crop.pineapple": "ኣናናስ",
  "crop.potato": "ድንሽ",
  "crop.red_pepper": "በርበረ",
  "crop.sesame": "ሰሊጥ",
  "crop.sorghum": "ማሽላ",
  "crop.soybean": "ሶያ",
  "crop.teff": "ጣፍ",
  "crop.tomato": "ኮሚደረ",
  "crop.wheat": "ስርናይ",
  "crop.coffee": "ቡን",
  "crop.chickpea": "ሽምብራ",
  "crop.faba_bean": "ባልደንጓ",
  "region.addis_ababa": "ኣዲስ ኣበባ",
  "region.afar": "ዓፋር",
  "region.amhara": "ኣምሓራ",
  "region.benishangul-gumuz": "ቤንሻንጉል ጉሙዝ",
  "region.central_ethiopia": "ማእከላይ ኢትዮጵያ",
  "region.dire_dawa": "ድሬዳዋ",
  "region.gambela": "ጋምቤላ",
  "region.harari": "ሓረሪ",
  "region.oromia": "ኦሮሚያ",
  "region.sidama": "ሲዳማ",
  "region.somali": "ሶማሊ",
  "region.south_ethiopia": "ደቡብ ኢትዮጵያ",
  "region.south_west_ethiopia": "ደቡብ ምዕራብ ኢትዮጵያ",
  "region.south_west": "ደቡብ ምዕራብ",
  "region.snnp": "ደቡብ ብ/ብ/ሕ",
  "region.tigray": "ትግራይ",
  "unit.quintal": "ኩንታል",
  "unit.kg": "ኪ.ግ",
  "unit.etb": "ብር",
  "category.seeds": "ዘርኢ",
  "category.fertilizer": "ማዳበርያ",
  "category.fungicide": "መከላኸሊ ፈንገስ",
  "category.herbicide": "መከላኸሊ ሳዕሪ",
  "category.insecticide": "መከላኸሊ ሓሰኻ",
  "month.1": "ጥሪ",
  "month.2": "ለካ",
  "month.3": "መጋ",
  "month.4": "ሚያ",
  "month.5": "ግን",
  "month.6": "ሰነ",
  "month.7": "ሓም",
  "month.8": "ነሓ",
  "month.9": "መስ",
  "month.10": "ጥቅ",
  "month.11": "ሕዳ",
  "month.12": "ታሕ",
  "time.seconds": "{n} ካልኢት",
  "time.minutes": "{n} ደቒቕ",
  "time.hoursMinutes": "{h} ሰዓት {m} ደቒቕ",

  // ── Sign in / sign up ──────────────────────────────────────────────────
  "auth.tagline": "ሓበሬታ ዕዳጋ ሕርሻ ንሓረስቶት፣ ነጋዶን ሰራሕተኛታት ልምዓትን ኢትዮጵያ።",
  "auth.point1": "ካብ ልዕሊ 300 ዕዳጋታት ኢትዮጵያ ሰሙናዊ ዋጋታት ዘርእቲ",
  "auth.point2": "መዓስ ከም እትሸጡ ንምውሳን ዝሕግዙ ትንበያታት ዋጋ",
  "auth.point3": "መርመራ ጥዕና ዘርእቲ፣ ኣቕረብቲ እታዋትን ኣማራጺታት ልቓሕን",

  // ── Forms ──────────────────────────────────────────────────────────────
  "form.phone": "ቁጽሪ ቴሌፎን",
  "form.password": "መሕለፊ ቃል",
  "form.passwordPlaceholder": "መሕለፊ ቃልኩም ኣእትዉ",
  "form.confirmPassword": "መሕለፊ ቃል ኣረጋግጹ",
  "form.hidePassword": "መሕለፊ ቃል ሕባእ",
  "form.showPassword": "መሕለፊ ቃል ኣርኢ",
  "form.fullName": "ምሉእ ስም",
  "form.language": "ቋንቋ",
  "form.role": "ተራ",

  // ── Sign in ────────────────────────────────────────────────────────────
  "signin.title": "እቶ",
  "signin.subtitle": "ቁጽሪ ቴሌፎንኩምን መሕለፊ ቃልኩምን ኣእትዉ።",
  "signin.missing": "ቁጽሪ ቴሌፎንኩምን መሕለፊ ቃልኩምን ኣእትዉ።",
  "signin.noAccount": "ሕሳብ የብልኩምን?",
  "signin.createOne": "ሓድሽ ክፈቱ",
  "signin.demoAccounts": "ቅልጡፍ ምእታው",  // draft – needs native review

  // ── Sign up ────────────────────────────────────────────────────────────
  "signup.metaTitle": "ሕሳብ ክፈቱ",
  "signup.title": "ሕሳብኩም ክፈቱ",
  "signup.subtitle": "ካብ ሓደ ደቒቕ ዝውሕድ ግዜ ይወስድ።",
  "signup.passwordHint": "እንተወሓደ 6 ፊደላት",
  "signup.repeatPassword": "መሕለፊ ቃል ድገሙ",
  "signup.iAmA": "ኣነ",
  "signup.agentNote": "ሰራሕተኛ ልምዓት ዲኹም? ከም ሓረስታይ ተመዝገቡ እሞ ኣመሓዳሪኹም ሕሳብኩም ክቕይሮ ሕተቱ።",
  "signup.woredaNote": "ኩነታት ኣየር፣ ዋጋታትን መጠንቀቕታ ሕማምን ምስ እትሓርስዎ ቦታ ንኽሰማምዑ ወረዳኹም ምረጹ።",
  "signup.submit": "ሕሳብ ክፈት",
  "signup.haveAccount": "ሕሳብ ኣለኩም ድዩ?",
  "signup.errName": "ምሉእ ስምኩም ኣእትዉ።",
  "signup.errPhone": "ብ0 ዝጅምር ባዕሉ 10 ኣሃዝ ዘለዎ ቁጽሪ ቴሌፎን ኣእትዉ፤ ንኣብነት 0911234567።",
  "signup.errPassword": "መሕለፊ ቃል እንተወሓደ 6 ፊደላት ክኸውን ኣለዎ።",
  "signup.errMismatch": "ክልቲኦም መሕለፊ ቃላት ኣይሰማምዑን።",
  "signup.errRegion": "ክልልኩም ምረጹ።",

  // ── Market insights (plain-language analysis) ──────────────────────────
  "ins.thisCrop": "እዚ ዘርኢ",
  "ins.unit": "መለክዒ",
  "ins.cropInRegion": "{crop} ኣብ {region}",
  "ins.ts.up": "ዋጋ {crop} ኣብዚ እዋን ብ{pct}% ወሲኹ።",
  "ins.ts.down": "ዋጋ {crop} ኣብዚ እዋን ብ{pct}% ጎዲሉ።",
  "ins.ts.flat": "ዋጋ {crop} ኣብዚ እዋን ብዙሕ ኣይተቐየረን።",
  "ins.ts.rising": "ዋጋታት ይውስኹ ኣለዉ። እዚ መብዛሕትኡ ግዜ ዕዳጊ ምብዛሕ ወይ ኣብ ዕዳጋ ዘሎ ፍርያት ምውሓድ የርኢ።",
  "ins.ts.slowUp": "ዋጋታት ቀስ ብቐስ ይውስኹ ኣለዉ። ማእከላይ ወሰኽ እዩ — ዕዳጋ ቁሩብ ይኸቢ ኣሎ።",
  "ins.ts.falling": "ዋጋታት ይጎድሉ ኣለዉ። እዚ መብዛሕትኡ ግዜ ብዙሕ ፍርያት ምህላው ወይ ሕጂ ዕዳጊ ምውሓድ የርኢ።",
  "ins.ts.slowDown": "ዋጋታት ቀስ ብቐስ ይጎድሉ ኣለዉ። ተወሳኺ ፍርያት ናብ ዕዳጋ ይኣቱ ክህሉ ይኽእል።",
  "ins.ts.steady": "ዋጋታት ርጉኣት እዮም። ዕዳጋ ብዙሕ ኣይተቐየረን — ዕዳግትን ሸየጥትን ብግምት ማዕረ እዮም።",
  "ins.ts.belowPeak": "እቲ ዝለዓለ ዋጋ ኣብ {month} {peak} ነይሩ። ናይ ሎሚ ዋጋ ({now}) ካብቲ ዝለዓለ ብ{pct}% ይትሕት።",
  "ins.ts.nearPeak": "ዋጋታት ኣብ {month} ዳሕራይ ዝተራእየ ዝለዓለ ዋጋ {peak} ቀሪቦም ኣለዉ። ዕዳጋ ሕጂ ሓያል እዩ።",
  "ins.ts.volatile": "ዋጋታት ካብ ሰሙን ናብ ሰሙን ብዙሕ ይድይቡን ይወርዱን። እትረኽብዎ ዋጋ ምግማት ከቢድ እዩ። ኩሉ ሓንሳብ ዘይኮነስ ቁሩብ ቁሩብ ክትሸጡ ፈትኑ።",
  "ins.ts.moderate": "ዋጋታት ካብ ሰሙን ናብ ሰሙን ቁሩብ ይቕየሩ፣ ግን ብዙሕ ኣይኮነን። እዚ ንመብዛሕትኦም ዘርእቲ ልሙድ እዩ።",
  "ins.ts.stable": "ዋጋታት ኣዝዮም ርጉኣት እዮም። መሸጣኹም ብዝበለጸ ርግጸኝነት ከተውጽኡ ትኽእሉ።",
  "ins.ts.momUp": "ኣብ ዝሓለፉ 4 ሰሙናት ዋጋታት ብቕልጡፍ ይውስኹ ነይሮም። ንምሻጥ ጽቡቕ እዋን ክኸውን ይኽእል።",
  "ins.ts.momDown": "ኣብ ዝሓለፉ 4 ሰሙናት ዋጋታት ይጎድሉ ነይሮም። ዋጋ ዝያዳ ቅድሚ ምውራዱ ቀልጢፍኩም ክትሸጡ ሕሰቡ።",
  "ins.reg.different": "ዋጋ {crop} ሕጂ ኣብ መንጎ ክልላት ኣዝዩ ይፈላለ። {max} ዝለዓለ፣ {min} ዝተሓተ ይኸፍሉ።",
  "ins.reg.similar": "ዋጋ {crop} ኣብ መብዛሕትኦም ክልላት ተመሳሳሊ እዩ። ፍልልይ ኣብ መንጎ ቦታታት ንእሽቶ እዩ።",
  "ins.reg.bestWorst": "ኣብ {max} እንተሸጥኩም ኣስታት {maxPrice} ክትረኽቡ ትኽእሉ። ኣብ {min} ዋጋ ትሑት እዩ፣ {minPrice}። ፍልልዩ ብ{unit} {diff} እዩ።",
  "ins.reg.average": "ማእከላይ ዋጋ ኣብ ኩሎም {n} ክልላት {price} እዩ። ምስቲ ኣብ ናይ ከባቢኹም ዕዳጋ ዝቐርበልኩም ዋጋ ንምንጽጻር ተጠቐሙሉ።",
  "ins.reg.converging": "ዋጋታት ኣብ መንጎ ክልላት ምስ ግዜ እናተቐራረቡ መጺኦም። ሕጂ ኣብ ኣየናይ ክልል ምሻጥኩም ብዙሕ ኣየፈላልን።",
  "ins.reg.diverging": "ፍልልይ ኣብ መንጎ ክልላት ዓብዩ። ኣብቲ ቅኑዕ ክልል ምሻጥ ካብ ቅድሚኡ ዝያዳ ኣታዊኹም ይቕይር።",
  "ins.reg.bigGap": "ፍልልይ ዋጋ ኣብ መንጎ ክልላት ኣዝዩ ዓብዪ እዩ ({pct}%)። ወጻኢ መጓዓዝያ እንተፈቒዱ ካብ {min} ኣብ {max} ምሻጥ ብዙሕ ዝያዳ ከርክበኩም ይኽእል።",
  "ins.reg.close": "ዋጋታት ኣብ ኩሎም ክልላት ኣዝዮም ተቐራረብቲ እዮም። ኣብ ጥቓኹም ዘሎ ዕዳጋ ምሻጥ ምናልባት እቲ ዝበለጸ እዩ — ርሒቕኩም ብምኻድ ዝርከብ መኽሰብ ውሑድ እዩ።",
  "ins.spr.large": "ዕዳግቲ ድኳን ን{crop} ካብቲ ሓረስቶት ዝረኽብዎ ኣዝዩ ዝያዳ ይኸፍሉ። ደላሎ ዓብዪ ብጽሒት ይወስዱ።",
  "ins.spr.medium": "ዋጋ ድኳን {crop} ካብቲ ንሓረስቶት ዝኽፈል ብኣስታት {pct}% ይልዕል።",
  "ins.spr.small": "ን{crop} ፍልልይ ዋጋ ግራትን ዋጋ ድኳንን ንእሽቶ እዩ። ሓረስቶት ቅኑዕ ብጽሒቶም ይረኽቡ ኣለዉ።",
  "ins.spr.fact": "ንነፍሲ ወከፍ ዝተሸጠ {unit} {crop}፣ ዋጋ ድኳን ካብቲ ሓረስታይ ዝረኽቦ ብ{amount} ይበልጽ። እዚ ናይ {pct}% ፍልልይ እዩ። ነጋዶ፣ መጓዓዝያን ኣተሓሕዛን እዚ መጠን ይወስዱ።",
  "ins.spr.growing": "ፍልልይ ዋጋ ግራትን ዋጋ ድኳንን ይዓቢ ኣሎ። ሓረስቶት ካብቲ ናይ መወዳእታ ዋጋ ዝረኽብዎ ብጽሒት ይንእስ ኣሎ።",
  "ins.spr.shrinking": "ፍልልይ ዋጋ ግራትን ዋጋ ድኳንን ይጸብብ ኣሎ። ሓረስቶት ካብቲ ናይ መወዳእታ ዋጋ ዝበለጸ ብጽሒት ይረኽቡ ኣለዉ።",
  "ins.spr.same": "ፍልልይ ዋጋ ግራትን ዋጋ ድኳንን ብዙሕ ኣይተቐየረን። ኣብ ምምቕቓል ረብሓ ዓብዪ ለውጢ የለን።",
  "ins.spr.veryHigh": "ፍልልይ ግራትን ዕዳጋን ኣዝዩ ልዑል እዩ ({pct}%)። እንተተኻኢሉ ንናይ ከባቢ ነጋዶ ዘይኮነስ ኣብ ጥቓ ዘሎ ዕዳጋ ከተማ ብቐጥታ ክትሸጡ ፈትኑ። እዚ ዝያዳ ኣታዊ ከርክበኩም ይኽእል።",
  "ins.spr.fair": "ፍልልይ ዋጋ ግራትን ድኳንን ንእሽቶ እዩ። እዚ ጽቡቕ እዩ — ነጋዶ ካብ ኣታዊኹም ብዙሕ ኣይወስዱን ማለት እዩ።",
  "ins.time.week1": "1 ሰሙን",
  "ins.time.weeks": "{n} ሰሙናት",
  "ins.time.month1": "ኣስታት 1 ወርሒ",
  "ins.time.months2": "ኣስታት 2 ኣዋርሕ",
  "ins.time.months3": "ኣስታት 3 ኣዋርሕ",
  "ins.action.wait": "ንምሻጥ ተጸበዩ",
  "ins.action.hold": "ንሕጂ ሓዙ",
  "ins.action.sellNow": "ሕጂ ሽጡ",
  "ins.action.sellSoon": "ቀልጢፍኩም ሽጡ",
  "ins.action.sellUrgently": "ብህጹጽ ሽጡ",
  "ins.fc.up": "ዋጋ {crop} ኣብ {region} ኣብ ዝመጽእ {time} ብኣስታት {pct}% ክውስኽ ይጽበ። ምጽባይ ዝያዳ ገንዘብ ከርክበኩም ይኽእል።",
  "ins.fc.down": "ዋጋ {crop} ኣብ {region} ኣብ ዝመጽእ {time} ብኣስታት {pct}% ክጎድል ይጽበ። ቀልጢፍኩም ምሻጥ ዝያዳ ውሑስ እዩ።",
  "ins.fc.flat": "ዋጋ {crop} ኣብ {region} ኣብ ዝመጽእ {time} ብዙሕ ከይቕየር ይጽበ። ዓብዪ ለውጢ ኣይተተንበየን።",
  "ins.fc.adviceWait": "ዋጋታት ይውስኹ ኣለዉ። ቅድሚ ምሻጥኩም {time} ክትጽበዩ እንተኽኢልኩም ካብ ናይ ሎሚ ዋጋ ብኣስታት {pct}% ዝያዳ ክትረኽቡ ትኽእሉ። ፍርያትኩም ብውሕስነት ክትዕቅቡ እንተኽኢልኩም ጥራይ ተጸበዩ።",
  "ins.fc.adviceNow": "ዋጋታት ብዙሕ ክቕየሩ ኣይጽበን። ንምጽባይ ሓያል ምኽንያት የለን። ሕጂ ምሻጥ ብዘይ ሓደጋ ናይ ሎሚ ቅኑዕ ዋጋ የርክበኩም።",
  "ins.fc.adviceSoon": "ዋጋታት ይጎድሉ ኣለዉ። ብዝጸናሕኩም መጠን እትረኽብዎ ክጎድል ይኽእል። ፍርያትኩም ብዝተኻእለ ቅልጣፈ ክትሸጡ ፈትኑ።",
  "ins.fc.uncertainHigh": "እዚ ትንበያ ርግጸኛ ኣይኮነን። ዋጋታት ካብቲ ዝተጸበየ ክልዕሉ ወይ ክትሕቱ ይኽእሉ። ውሑስ መደብ ገለ ሕጂ ገለ ድሓር ምሻጥ እዩ — ኩሉ ሓንሳብ ኣይትሸጡ።",
  "ins.fc.uncertainMid": "ኣብዚ ትንበያ ገለ ዘይርግጸኛነት ኣሎ። ኣንፈቱ ቅኑዕ ክኸውን ይኽእል፣ ልክዕ ዋጋ ግን ክፈላለ ይኽእል። ዕዳጋ ሰሙናዊ ተኸታተሉ።",
  "ins.fc.reliable": "እዚ ትንበያ ብኣንጻራዊ ተኣማኒ እዩ። ኣንፈት ዋጋ ኣብ ሓያል ሓበሬታ ዕዳጋ ዝተመስረተ እዩ።",
  "ins.fc.dataHigh": "እዚ ትንበያ ናይ {n} ሰሙናት ዝሓለፈ ሓበሬታ ዕዳጋ ይጥቀም። እዚ ብዙሕ ታሪኽ ስለ ዝኾነ ትንበያኡ ተኣማኒ እዩ።",
  "ins.fc.dataMedium": "እዚ ትንበያ ኣብ {n} ሰሙናት ዝሓለፈ ሓበሬታ ዝተመስረተ እዩ። ጽቡቕ መምርሒ እዩ ግን ፍጹም ኣይኮነን።",
  "ins.fc.dataLow": "ነዚ ዘርእን ክልልን ዘሎና ዝሓለፈ ሓበሬታ {n} ሰሙናት ጥራይ እዩ። ከም ግምታዊ መምርሒ ተጠቐሙሉ እሞ ንዝያዳ ሓበሬታ ናይ ከባቢኹም ክኢላ ዕዳጋ ሕተቱ።",
  "ins.fc.dataVeryLow": "ነዚ ዘርኢ ዘሎና ዝሓለፈ ሓበሬታ ኣዝዩ ውሑድ እዩ ({n} ሰሙናት)። እዚ ትንበያ ግምት ጥራይ እዩ። ዓብዪ ውሳነ ቅድሚ ምውሳድኩም ናይ ከባቢ ነጋዳይ ኣዘራርቡ።",
  "ins.fc.growMore": "ንዝመጽእ ወቕቲ ዝያዳ {crop} ምፍራይ ጽቡቕ ሓሳብ ይመስል። ዋጋታት ክልዕሉ ስለ ዝጽበ፣ እቲ ፍርያትኩም ዝያዳ ከኣቱ እዩ።",
  "ins.fc.growCareful": "ሕጂ ብዙሕ {crop} ቅድሚ ምፍራይኩም ተጠንቀቑ። እቲ ዝቕጽል ፍርያትኩም ክበጽሕ ከሎ ዋጋታት ክወርዱ ይኽእሉ። ተወሳኺ ቅድሚ ምዝራእኩም ዕዳግቲ ወይ ማሕበራት ሕብረት ስራሕ ኣዘራርቡ።",
  "ins.fc.growSafe": "ንዝመጽእ ወቕቲ {crop} ምፍራይ ውሑስ ምርጫ እዩ። ዋጋታት ርጉኣት ስለ ዝኾኑ ኣታዊኹም ዝግመት እዩ።",

  // ── Dashboard ──────────────────────────────────────────────────────────
  "weekday.0": "ሰንበት",
  "weekday.1": "ሰኑይ",
  "weekday.2": "ሰሉስ",
  "weekday.3": "ረቡዕ",
  "weekday.4": "ሓሙስ",
  "weekday.5": "ዓርቢ",
  "weekday.6": "ቀዳም",
  "dash.meta": "ሓፈሻዊ ትዕዝብቲ ዕዳጋኹም",
  "dash.morning": "ከመይ ሓዲርኩም፣ {name}",
  "dash.afternoon": "ከመይ ውዒልኩም፣ {name}",
  "dash.evening": "ከመይ ኣምሲኹም፣ {name}",
  "dash.setRegion": "ክልልኩም ምረጹ",
  "dash.loadingPrices": "ዋጋታት ናይዚ ሰሙን ይጽዕን ኣሎ…",
  "dash.noRecentPrices": "ኣብ {region} ናይ ቀረባ ግዜ ዋጋ የለን",
  "dash.sellingAdvice": "ምኽሪ መሸጣ፦ {crop} ኣብ {region}",
  "dash.basedOnForecast": "ኣብ ናይ 4 ሰሙን ትንበያ ዋጋ ዝተመስረተ",
  "dash.fullForecast": "ምሉእ ትንበያ",
  "dash.checkingForecast": "ትንበያ ይርኢ ኣሎ…",
  "dash.forecastUnavailable": "ትንበያ ኣይርከብን",
  "dash.notEnoughData": "እኹል ሓበሬታ የለን",
  "dash.cannotForecast": "ዋጋ {crop} ኣብ {region} ገና ክንትንብዮ ኣይንኽእልን።",
  "dash.todayToForecast": "ሎሚ {now} → ኣብ 4 ሰሙን ኣስታት {later}",
  "dash.allFarms": "ኩሎም ግራውቲ",
  "dash.farmsIn": "ግራውቲ ኣብ {region}",
  "dash.farmsInYourRegion": "ኣብ ክልልኩም ዘለዉ ግራውቲ",
  "dash.myFarms": "ግራውተይ",
  "dash.manage": "ኣመሓድር",
  "dash.noFarmsAll": "ክሳብ ሕጂ ግራት ዝመዝገበ ሓረስታይ የለን።",
  "dash.noFarmsRegion": "ኣብ {region} ክሳብ ሕጂ ግራት ዝመዝገበ ሓረስታይ የለን።",
  "dash.askRegion": "ክልልኩም ክምድበልኩም ኣመሓዳሪ ሕተቱ።",
  "dash.noFarmsYet": "ክሳብ ሕጂ ግራት የለን",
  "dash.addFieldsHint": "መርመራ ጥዕና ዘርእትን ዝበለጸ ኣማራጺ ልቓሕን ንምርካብ ግራውትኹም መዝግቡ።",
  "dash.addFarm": "ግራት ወስኽ",
  "dash.noFarmsToShow": "ዝርአ ግራት የለን",
  "dash.quickLinks": "ቅልጡፍ መራኸቢታት",
  "farm.status.healthy": "ጥዑይ",
  "farm.status.warning": "ክትትል የድልዮ",
  "farm.status.critical": "ኣሻቃሊ",
  "price.retail": "ናይ ችርቻሮ",
  "price.wholesale": "ናይ ጅምላ",
  "price.producer": "ናይ ኣፍራዪ",
  "price.perUnit": "ብ{unit}",
  "unit.ha": "ሄ/ር",

  // ── Market Intel ───────────────────────────────────────────────────────
  "market.meta": "ዋጋታት ዘርእቲ፣ ምንጽጻር ክልላትን ትንበያታትን",
  "market.description": "ካብ ዕዳጋታት መላእ ኢትዮጵያ ሰሙናዊ ዋጋታት ዘርእቲ። ዋጋታት ብኸመይ ከም ዝቕየሩ ንምርኣይ ዘርእን ክልልን ምረጹ።",
  "market.view.trend": "ኣካይዳ ዋጋ",
  "market.view.regional": "ክልላት ኣነጻጽር",
  "market.view.heatmap": "ዕዳጋታት ኣነጻጽር",
  "market.view.spread": "ዋጋ ግራትን ድኳንን",
  "market.view.forecast": "ትንበያ",
  "market.views": "ትዕዝብቲ ዕዳጋ",
  "market.level.retail": "ችርቻሮ (ዋጋ ድኳን)",
  "market.level.wholesale": "ጅምላ",
  "market.level.producer": "ኣፍራዪ (ዋጋ ኣፍደገ ግራት)",
  "market.range.3": "ዝሓለፉ 3 ኣዋርሕ",
  "market.range.6": "ዝሓለፉ 6 ኣዋርሕ",
  "market.range.12": "ዝሓለፉ 12 ኣዋርሕ",
  "market.range.24": "ዝሓለፉ 2 ዓመታት",
  "market.range.all": "ምሉእ ታሪኽ",
  "market.range.custom": "ናይ ባዕልኹም ዕለታት",
  "confidence.high": "ልዑል ርግጸኝነት",
  "confidence.medium": "ማእከላይ ርግጸኝነት",
  "confidence.low": "ትሑት ርግጸኝነት",
  "confidence.veryLow": "ኣዝዩ ትሑት ርግጸኝነት",
  "market.loadingMeta": "ዘርእትን ዕዳጋታትን ይጽዕን ኣሎ…",
  "market.unavailable": "ሓበሬታ ዕዳጋ ኣይርከብን",
  "market.crop": "ዘርኢ",
  "market.variety": "ዓሌት",
  "market.allVarieties": "ኩሎም ዓሌታት",
  "market.allRegions": "ኩሎም ክልላት",
  "market.allRegionsLower": "ኩሎም ክልላት",
  "market.priceType": "ዓይነት ዋጋ",
  "market.timePeriod": "ግዜ",
  "market.from": "ካብ",
  "market.to": "ክሳብ",
  "market.dataAvailable": "ሓበሬታ {crop} ካብ {from} ክሳብ {to} ይርከብ · {n} መዛግብ ዋጋ",
  "market.latestPrice": "ናይ ቀረባ ግዜ ዋጋ {level}",
  "market.weekOf": "ሰሙን {date}",
  "market.changeWeek": "ካብ ዝሓለፈ ሰሙን ለውጢ",
  "market.wentUp": "ዋጋታት ወሲኾም",
  "market.wentDown": "ዋጋታት ጎዲሎም",
  "market.noChange": "ለውጢ የለን",
  "market.avg4": "ማእከላይ፣ ዝሓለፉ 4 ሰሙናት",
  "market.wholePeriod": "ናይ ምሉእ ግዜ {price}",
  "market.records": "ኣብቲ ግዜ ዘለዉ መዛግብ ዋጋ",
  "market.supplySignal": "ምልክት ኣቕርቦት፦ {signal}",
  "market.trend.title": "ዋጋ {level} {crop} ብግዜ",
  "market.trend.description": "ማእከላይ ኣብ {region}። እቲ ዝተጸለለ ክፋል ሰሙናዊ ዝተሓተን ዝለዓለን ዋጋ ዕዳጋ የርኢ።",
  "market.loadingPrices": "ዋጋታት ይጽዕን ኣሎ…",
  "market.noPrices": "ዋጋ ኣይተረኽበን",
  "market.noPricesHint": "ካልእ ክልል፣ ዓይነት ዋጋ ወይ ዝነውሐ ግዜ ፈትኑ።",
  "market.marketRange": "ደረት ዕዳጋ",
  "market.averagePrice": "ማእከላይ ዋጋ",
  "market.regional.title": "ዋጋ {crop} ብክልል",
  "market.regional.description": "ሕጂ ዋጋ ኣበይ እዩ ዝለዓለ? ነፍሲ ወከፍ መስመር ማእከላይ ዕዳጋታት ናይቲ ክልል እዩ።",
  "market.comparingRegions": "ክልላት የነጻጽር ኣሎ…",
  "market.noRegional": "ዋጋታት ክልል ኣይተረኽቡን",
  "market.noRegionalHint": "ዝነውሐ ግዜ ወይ ካልእ ዓይነት ዋጋ ፈትኑ።",
  "market.spread.title": "ሓረስቶት ዝረኽብዎን ዕዳግቲ ዝኸፍልዎን",
  "market.spread.description": "ኣብ መንጎ ክልተ መስመራት ዘሎ ፍልልይ ነጋዶ፣ መጓዓዝያን ኣተሓሕዛን ዝወስድዎ እዩ።",
  "market.loadingSpread": "ዋጋታት ግራትን ድኳንን ይጽዕን ኣሎ…",
  "market.noSpread": "እኹል ዋጋ ኣፍደገ ግራት የለን",
  "market.noSpreadHint": "ዋጋ ኣፍራዪ ኣብ ገለ ዕዳጋታት ጥራይ እዩ ዝእከብ። ካልእ ክልል ወይ ዝነውሐ ግዜ ፈትኑ።",
  "market.coverage": "ነዚ ምርጫ ዋጋ ኣፍደገ ግራት ዘቕርቡ {pct}% ዕዳጋታት ጥራይ ስለ ዝኾኑ፣ ነቲ ፍልልይ ከም ግምታዊ መምርሒ ውሰድዎ።",
  "market.shopPrice": "ዋጋ ድኳን",
  "market.farmPrice": "ዋጋ ግራት",
  "market.gap": "ፍልልይ",
  "market.shopPriceRetail": "ዋጋ ድኳን (ችርቻሮ)",
  "market.farmPriceProducer": "ዋጋ ግራት (ኣፍራዪ)",
  "market.fc.title": "ትንበያ ዋጋ {crop} — {region}",
  "market.fc.description": "ንዝመጽኡ ሰሙናት ዝጽበ ዋጋ ችርቻሮ። እቲ ዝተጸለለ ክፋል ክኸውን ዝኽእል ደረት የርኢ።",
  "market.fc.region": "ክልል ትንበያ",
  "market.fc.weeksAhead": "ዝመጽኡ ሰሙናት",
  "market.fc.calculating": "ትንበያ ይሕሰብ ኣሎ…",
  "market.fc.none": "ትንበያ ኣይርከብን",
  "market.fc.noneHint": "ነዚ ዘርእን ክልልን እኹል ታሪኽ የለን።",
  "market.fc.ourAdvice": "ምኽርና",
  "market.fc.priceToday": "ዋጋ ሎሚ",
  "market.fc.expectedIn": "ኣብ {n} ሰሙናት ዝጽበ",
  "market.fc.likelyRange": "ክኸውን ዝኽእል ደረት",
  "market.fc.expectedPrice": "ዝጽበ ዋጋ",
  "market.fc.model": "ሞዴል፦ {model}",
  "market.fc.levelPrices": "ዋጋታት {level}",
  "market.fc.shouldSell": "ሕጂ ክትሸጡ ይግባእ ድዩ?",

  // ── Market heatmap ─────────────────────────────────────────────────────
  "insight.title": "እዚ ንዓኹም እንታይ ማለት እዩ",
  "heat.title": "ዋጋ {crop} ብዕዳጋ",
  "heat.titleRegion": "ዋጋ {crop} ብዕዳጋ — {region}",
  "heat.description": "ነፍሲ ወከፍ መስርዕ ሓደ ዕዳጋ፣ ነፍሲ ወከፍ ርብዒት ሓደ ሰሙን እዩ። ውዑያት ሕብርታት ልዑል ዋጋ፣ ዝሑላት ሕብርታት ትሑት ዋጋ የርእዩ።",
  "heat.sort": "ዕዳጋታት ስርዕ",
  "heat.sortPrice": "ዝለዓለ ዋጋ ቅድም",
  "heat.sortName": "ሀ–ፐ",
  "heat.chooseRegion": "ክልል ምረጹ",
  "heat.chooseRegionHint": "እዚ ሰሌዳ ዕዳጋታት ሓደ ብሓደ ስለ ዘነጻጽር፣ ሓደ ክልል ብሓደ ግዜ የድልዮ።",
  "heat.building": "ሰሌዳ ዕዳጋ ይዳሎ ኣሎ…",
  "heat.noPrices": "ዋጋታት ዕዳጋ ኣይተረኽቡን",
  "heat.noPricesHint": "ካልእ ዓይነት ዋጋ ወይ ዝነውሐ ግዜ ፈትኑ።",
  "heat.size": "{markets} ዕዳጋታት × {weeks} ሰሙናት",
  "heat.showingTop": "ብዙሕ ዝጸብጽቡ {n} ዕዳጋታት ይርኣዩ ኣለዉ (ካብ {total})",
  "heat.noReport": "ጸብጻብ የለን",
  "heat.aria": "ሰሌዳ ዋጋ ብዕዳጋን ብሰሙንን",
  "heat.noPriceReported": "ዋጋ ኣይተጸብጸበን",
  "heat.whereToSell": "ኣበይ ይሸየጥ",
  "heat.ins.recent": "ኣብ ዝሓለፉ {weeks} ሰሙናት {top} ኣስታት {topPrice} ከፊሉ። {bottom} ኣስታት {bottomPrice} ከፊሉ።",
  "heat.ins.difference": "እዚ ኣብ ሓደ ክልል ኣብ ዘለዉ ዕዳጋታት ብ{unit} {diff} ({pct}%) ፍልልይ እዩ።",
  "heat.ins.bigGap": "ኣብ መንጎ ቀረባ ዕዳጋታት ዋጋ ኣዝዩ ይፈላለ። ናብ ልዑል ዋጋ ዘለዎ ዕዳጋ ክትበጽሑ እንተኽኢልኩም፣ ወጻኢ መጓዓዝያ ተሓሲቡ እውን እቲ ጉዕዞ ክረብሕ ይኽእል።",
  "heat.ins.similar": "ኣብዚ ክልል ዘለዉ ዕዳጋታት ተመሳሳሊ ዋጋ ይኸፍሉ። ኣብ ጥቓኹም ዘሎ ዕዳጋ ምሻጥ መብዛሕትኡ ግዜ እቲ ዝበለጸ እዩ።",
  "heat.ins.others": "ሕጂ ልዑል ዝኸፍሉ ካልኦት ዕዳጋታት፦ {markets}።",
  "heat.ins.headline": "ሕጂ ን{crop} ኣብ {region} ዝለዓለ ዝኸፍል ዘሎ {market} እዩ።",
  "area.chooseRegion": "ክልል ምረጹ",

  // ── AI advisor ─────────────────────────────────────────────────────────
  "advisor.meta": "ካብ መምርሒታት ሚኒስትሪ ሕርሻ ዝተረኽቡ መልስታት",
  "advisor.description": "ብኣምሓርኛ፣ ብኦሮምኛ፣ ብትግርኛ ወይ ብእንግሊዝኛ ሕተቱ። መልስታት ካብ መምርሒታት ሚኒስትሪ ሕርሻን ሓበሬታ ግራትኩምን ምስ ምንጮም ይመጹ።",
  "advisor.title": "ኣማኻሪ ሕርሻ",
  "advisor.subtitle": "መምርሒታት ስርናይ ሚኒስትሪ ሕርሻ · ኩነታት ኣየር · ዋጋ ዕዳጋ",
  "advisor.panelSubtitle": "መምርሒታት ሚኒስትሪ ሕርሻ · ኩነታት ኣየር · ዋጋ — አማርኛ, Afaan Oromoo, ትግርኛ, English",
  "advisor.newChat": "ሓድሽ ዝርርብ",
  "advisor.emptyTitle": "ኣማኻሪ ሕርሻኹም ሕተቱ",
  "advisor.emptyBody": "ነፍሲ ወከፍ መልሲ ካበይ ከም ዝመጸ የርኢ። መምርሒታት ሕቶኹም እንተዘይሸፈኑ፣ ካብ ምግማት ናብ ሰራሕተኛ ልምዓትኩም ይለኣኽ።",
  "advisor.tryAsking": "እዚ ሕተቱ",
  "advisor.tapToSend": "ንምልኣኽ ነቲ ሕቶ ጠውቑ።",
  "advisor.howItWorks": "ኣማኻሪ ብኸመይ ይሰርሕ",
  "advisor.how1": "መልሲ ካብ ኣየናይ ገጽ መምርሒ ከም ዝመጸ ንምርኣይ ከም S1 ዝበለ ምልክት ምንጪ ጠውቑ።",
  "advisor.how2": "መጠን መከላኸሊ ሓሰኻ ፈጺሙ ኣይነግርን። ንምንፍሕ ካብ ጥዕና ዘርእቲ ዝርከብ መደብ ሕክምና ተጠቐሙ ወይ ሰራሕተኛ ልምዓትኩም ሕተቱ።",
  "advisor.how3": "ዋጋታትን ትንበያታትን መምርሒ እምበር መብጽዓ ኣይኮኑን።",
  "advisor.how4": "መርዛም እንተኣጋጢሙ፣ ነቲ ዝርአ ቁጽሪ ህጹጽ ረድኤት ብቕጽበት ደውሉ።",
  "advisor.auto": "ባዕሉ",
  "advisor.answerLanguage": "ቋንቋ መልሲ",
  "advisor.sourceRef": "ምንጪ {ref}",
  "advisor.openSource": "ሰነድ ምንጪ ክፈት",
  "advisor.kind.poisoning": "መርዛም ክኸውን ይኽእል — ሕጂ ሓገዝ ርኸቡ።",
  "advisor.kind.refusal": "እቲ ፍርያት ንኣገልግሎት ኣይተፈቕደን።",
  "advisor.kind.dontKnow": "ብመምርሒታት ኣይተሸፈነን።",
  "advisor.kind.person": "ምስ ሰብ የራኽበኩም ኣሎ።",
  "advisor.kind.unavailable": "ኣማኻሪ ሕጂ ኣይርከብን።",
  "advisor.escalated": "ሕቶኹም ናብ ሰራሕተኛ ልምዓትኩም ተላኢኹ።",
  "advisor.hideSources": "ምንጭታት ሕባእ",
  "advisor.source": "{n} ምንጪ",
  "advisor.sources": "{n} ምንጭታት",
  "advisor.thanks": "ስለ ርእይቶኹም የቐንየልና",
  "advisor.helpful?": "እዚ ሓጋዚ ነይሩ ድዩ?",
  "advisor.helpful": "ሓጋዚ እዩ",
  "advisor.notHelpful": "ሓጋዚ ኣይኮነን",
  "advisor.unreachable": "ኣማኻሪ ክርከብ ኣይከኣለን። ርክብኩም ኣረጋግጹ እሞ ደጊምኩም ፈትኑ።",
  "advisor.open": "ኣማኻሪ ሕርሻ ክፈት",
  "advisor.close": "ኣማኻሪ ሕርሻ ዕጾ",
  "advisor.chat": "ዝርርብ ምስ ኣማኻሪ ሕርሻ",
  "advisor.openFull": "ምሉእ ገጽ ምኽሪ AI ክፈት",
  "advisor.panelWelcome": "ብዛዕባ ዘርእኹም፣ ማዳበርያ፣ ምስታይ ማይ፣ ሕማም ወይ ዋጋ ዕዳጋ ሕተቱ — ብኣምሓርኛ፣ ብኦሮምኛ፣ ብትግርኛ ወይ ብእንግሊዝኛ። ነፍሲ ወከፍ መልሲ ምንጩ የርኢ።",
  "advisor.typeQuestion": "ሕቶኹም ጸሓፉ…",
  "advisor.typing": "ኣማኻሪ ይጽሕፍ ኣሎ",
  "advisor.message": "መልእኽቲ",
  "advisor.send": "መልእኽቲ ስደድ",
  "alerts.label": "መጠንቀቕታታት",
  "alerts.checkWithPhoto": "ግራተይ ብስእሊ ክምርምር",
  "alerts.dismiss": "መጠንቀቕታ ዕጾ",
  "area.chooseZone": "ዞባ ምረጹ",
  "area.chooseWoreda": "ወረዳ ምረጹ",
  "area.regionFirst": "ቅድም ክልል ምረጹ",
  "area.zoneFirst": "ቅድም ዞባ ምረጹ",
  "area.loadFailed": "ዝርዝር ቦታታት ክጽዓን ኣይከኣለን። ርክብኩም ኣረጋግጹ።",

  // ── Crop health ────────────────────────────────────────────────────────
  "demo.title": "ኣመላኻቲ ሓበሬታ፦ ቅድሚ ምጥቃምኩም ኣረጋግጹ",  // draft – needs native review
  "demo.message": "ኣብዚ ዝርኣዩ {subject} ኣመላኻቲ እዮም። ቅድሚ ምግዛእኩም ወይ ምንጻግኩም ምስ መለለዪ ፍርያትን ናይ ሕጂ መዝገብ EAA ኣረጋግጹ፤ ምስ ሰራሕተኛ ልምዓትኩም'ውን ተመኻኸሩ።",  // draft – needs native review
  "demo.subject.products": "ኣስማት ፍርያትን መጠናትን",
  "demo.subject.suppliers": "ኣቕረብቲ፣ ፍርያትን ዋጋታትን",
  "demo.subject.textDiagnosis": "ብጽሑፍ ዝተዋህቡ መርመራታት፣ ኣስማት ፍርያትን መጠናትን",
  "demo.message.loans": "ኣብዚ ዝርኣዩ ለቃሕቲ፣ ዓይነታት ልቓሕን መጠን ወለድን ኣመላኻቲ እዮም። ቅድሚ ምምልካትኩም ውዕሉ ምስ ባንኪ ወይ ትካል ማይክሮፋይናንስ ኣረጋግጹ።",  // draft – needs native review
  "photo.outOfStock": "ኣብ መኽዘን የለን",  // draft – needs native review
  "photo.sources": "ምንጭታት፦ {list}",  // draft – needs native review
  "unit.km": "ኪ.ሜ",  // draft – needs native review
  "unit.lPerHa": "ሊትር/ሄክታር",  // draft – needs native review
  "severity.low": "ትሑት",
  "severity.moderate": "ማእከላይ",
  "severity.high": "ልዑል",
  "severity.critical": "ኣሻቃሊ",
  "crop.meta": "ዘርእትኹም ንሕማም መርምሩ",
  "crop.description": "ስእሊ ናይቶም ዝሓመሙ ቆጽሊ ኣልዕሉ። ሞዴል AI ነቲ ስእሊ ምስ ብራኸን ኩነታት ኣየርን ግራትኩም ኣጣሚሩ ይምርምር እሞ መደብ ሕክምና ይህብ።",
  "crop.example1": "ካብ ታሕቲ ተኽሊ ጀሚሩ ኣብ ቆጽሊ ብጫ መስመራት",
  "crop.example2": "ኣብ ቆጽሊ ብጫ ቀለበት ዘለዎም ቡናዊ ነጠብጣባት",
  "crop.example3": "ተኽልታት ይወድቑ ኣለዉ፣ ጉንዶም እውን ድኹም ይመስል",
  "crop.describeMore": "በጃኹም ዝረኣኹሞ ቁሩብ ብዝርዝር ግለጹ (እንተወሓደ ሓጺር ሓረግ)።",
  "crop.loadingFarms": "ግራውትኹም ይጽዕን ኣሎ…",
  "crop.addFarmFirst": "ቅድም ግራት መዝግቡ",
  "crop.noFarms": "ክሳብ ሕጂ ዝምርመር ግራት የለን",
  "crop.addFarmHint": "መርመራ ጥዕና ዘርእቲ ምስ ሓደ ካብ ግራውትኹም ስለ ዝተኣሳሰር ብግዜ ክንከታተሎ ንኽእል።",
  "crop.noFarmsRegion": "ኣብ {region} ክሳብ ሕጂ ግራት ዝመዝገበ ሓረስታይ የለን። ምስ መዝገቡ ኣብዚ ክርኣዩ እዮም።",
  "crop.noRegion": "ክልል ኣይተመደበልኩምን። ክልልኩም ክምድበልኩም ኣመሓዳሪ ሕተቱ።",
  "crop.goToProfile": "ናብ መግለጺ ርእሰይ ኪድ",
  "crop.checkField": "ግራት መርምሩ",
  "crop.mode.photo": "ብስእሊ ምምርማር",
  "crop.mode.describe": "ግለጹ (ቤታ)",  // draft – needs native review
  "crop.whichField": "ኣየናይ ግራት?",
  "crop.whatDoYouSee": "እንታይ ትርእዩ?",
  "crop.describePlaceholder": "ቆጽሊ፣ ጉንዲ ወይ ፍረ ግለጹ፦ ሕብሪ፣ ነጠብጣብ፣ ካበይ ከም ዝጀመረ፣ ክንደይ ክፋል ግራት…",
  "crop.checkMyCrop": "ዘርአይ መርምር",
  "crop.history": "ታሪኽ ጥዕና",
  "crop.historyHint": "ንግራውትኹም ዝተዓቀቡ መርመራታት",
  "crop.noHistory": "ክሳብ ሕጂ ዝተዓቀበ መርመራ የለን",
  "crop.noHistoryHint": "ኣብ ግራውትኹም ዘለዉ ጸገማት ንምክትታል መርመራ ዓቅቡ።",
  "crop.causedBy": "ዘምጽኦ {pathogen}",
  "crop.risk": "ሓደጋ {level}",
  "crop.match": "{pct}% ተዛማዲ",
  "crop.signs": "ዝርኣዩ ምልክታት",
  "crop.whatToDoDemo": "እንታይ ክትገብሩ (ቤታ)",  // draft – needs native review
  "crop.checkAgain": "ግራት ብ{date} ደጊምኩም መርምሩ።",
  "crop.guideOnly": "እዚ መምርሒ ጥራይ እዩ — ንኸቢድ ጸገማት ሰራሕተኛ ልምዓትኩም ደውሉ።",
  "crop.saved": "ኣብ ታሪኽ ተዓቂቡ",
  "crop.saveToHistory": "ኣብ ታሪኽ ዓቅብ",
  "crop.resolved": "ተፈቲሑ",
  "crop.markSolved": "ከም ዝተፈትሐ ምልክት ግበር",

  // ── Photo diagnosis ────────────────────────────────────────────────────
  "photo.cond.altitude": "ብራኸ",
  "photo.cond.temperature": "መጠን ሙቐት (ዝሓለፈ ሰሙን)",
  "photo.cond.humidity": "ጠሊ (ዝሓለፈ ሰሙን)",
  "photo.cond.rain": "ዝናብ (ዝሓለፈ ሰሙን)",
  "photo.needPhoto": "ቅድም ስእሊ ናይቶም ዝሓመሙ ቆጽሊ ኣልዕሉ ወይ ምረጹ።",
  "photo.selectedLeaf": "ዝተመርጸ ቆጽሊ",
  "photo.take": "ስእሊ ናይቶም ዝሓመሙ ቆጽሊ ኣልዕሉ",
  "photo.tips": "ብቐረባ፣ ብብርሃን መዓልቲ፣ ሓደ ቆጽሊ ንመብዛሕትኡ ስእሊ ክመልኦ",
  "photo.different": "ካልእ ስእሊ ተጠቐም",
  "photo.showIn": "ውጽኢት በዚ ቋንቋ ኣርኢ",
  "photo.check": "ስእሊ መርምር",
  "photo.whyConditions": "ዋግን ሴፕቶርያን ብኩነታት ኣየር ስለ ዝውሰኑ፣ ብራኸ ግራትኩምን ኩነታት ኣየር ዝሓለፈ ሰሙንን እውን ንጥቀም።",
  "photo.howDecided": "ሞዴል ብኸመይ ከም ዝወሰነ",
  "photo.photoOnly": "ብስእሊ ጥራይ",
  "photo.photoOnlyHint": "ስእሊ ቆጽሊ ጥራይ ዘመልክቶ",
  "photo.withConditions": "ስእሊ + ኩነታት ግራት",
  "photo.withConditionsHint": "ብራኸ፣ ሙቐት፣ ጠልን ዝናብን ይውስኽ",
  "photo.conditionsNotUsed": "ኣይተጠቕመሉን፦ ኩነታት ግራት ኣይተረኽበን ወይ ካብቲ ሞዴል ዝሰልጠነሉ ደረት ወጻኢ እዩ።",
  "photo.outOfRange": "{value} — ሞዴል ዝሰልጠነ ኣብ {min}–{max} እዩ።",
  "photo.p.dosePerHa": "መጠን ብሄክታር",
  "photo.p.perKnapsack": "ንሓደ ናይ ዝባን መንፈሒ",
  "photo.p.water": "ማይ",
  "photo.p.maxSprays": "ዝለዓለ ቁጽሪ ምንፋሕ",
  "photo.p.interval": "ኣብ መንጎ ምንፋሓት ዘለዉ መዓልታት",
  "photo.p.phi": "ቅድሚ ምእካብ ፍርያት ዘለዉ መዓልታት",
  "photo.p.reentry": "ካብ ግራት ርሓቑ",
  "photo.p.rainFree": "ድሕሪ ምንፋሕ ዝናብ ዘይብሉ ግዜ",
  "photo.hours": "{n} ሰዓት",
  "photo.reg": "ምዝገባ {n}",
  "photo.verified": "ዝተረጋገጸ",
  "photo.placeholder": "መዝገብ EAA ኣረጋግጹ",  // draft – needs native review
  "photo.ppe": "ክዳን መከላኸሊ፦ {items}",
  "photo.sponsored": "ብስፖንሰር",
  "photo.notChecked": "ክሳብ ሕጂ ብክኢላ ኣይተረጋገጸን",
  "photo.notCheckedBody": "መጠናት ምስ መዝገብ EAA ክሳብ ዝረጋገጹ ኣይርኣዩን። መለለዪ ፍርያት ስዓቡ፤ ቅድሚ ምግዛእኩም ወይ ምንጻግኩም ምስ ሰራሕተኛ ልምዓትኩም ኣረጋግጹ።",  // draft – needs native review
  "photo.inField": "ኣብ ግራት እንታይ ክትገብሩ ኣለኩም",
  "photo.ifSpray": "ምንፋሕ እንተኣድለየ",
  "photo.approvedAI": "ዝተፈቕዱ ንጡፋት ንጥረ ነገራት፦ {list}። ዝተመዝገበ ፍርያት ንምርካብ ሰራሕተኛ ልምዓትኩም ሕተቱ።",
  "photo.weather": "ኩነታት ኣየር",
  "photo.whereToBuy": "ኣበይ ይዕደግ (ዝቐረበ ቅድም)",
  "photo.kind.disease": "ሕማም ተረኺቡ",
  "photo.kind.healthy": "ጥዑይ ይመስል",
  "photo.kind.uncertain": "ርግጸኛ ኣይኮነን — ብቐረባ ክርአ ኣለዎ",
  "photo.kind.invalid": "በጃኹም ሓድሽ ስእሊ ኣልዕሉ",
  "photo.thankYou": "የቐንየልና።",
  "photo.daVisit": "ሰራሕተኛ ልምዓትኩም ክበጽሓኩም ተሓቲቱ።",
  "photo.outcome.better": "ተመሓይሹ",
  "photo.outcome.same": "ከምቲ ዝነበሮ",
  "photo.outcome.worse": "ብሒሱ",
  "photo.howNow": "እቲ ግራት ሕጂ ከመይ እዩ?",
  "photo.sure": "{pct} ርግጸኛ",
  "photo.daCheck": "ሰራሕተኛ ልምዓትኩም ነዚ ግራት ክምርምሮ ተሓቲቱ።",
  "photo.untilThen": "ክሳብ ሽዑ",
  "photo.askAgain": "ብ{date} ደጊምና ክንሓተኩም ኢና።",
  "model.brown_rust": "ቡናዊ ዋግ",
  "model.healthy": "ጥዑይ",
  "model.invalid": "ቆጽሊ ስርናይ ኣይኮነን",
  "model.powdery_mildew": "ሓሙዳዊ ሻጋታ",
  "model.septoria": "ሴፕቶርያ",
  "model.yellow_rust": "ብጫ ዋግ",
  "ppe.boots": "ቡትስ ጫማ",
  "ppe.gloves": "ጓንቲ",
  "ppe.goggles": "መከላኸሊ ዓይኒ",
  "ppe.long_sleeves": "ነዊሕ እጅጌ ክዳን",
  "ppe.mask": "ማስክ",
  "ppe.coverall": "ምሉእ ቱታ",
  "ppe.respirator": "መከላኸሊ ምስትንፋስ",

  // ── Input suppliers ────────────────────────────────────────────────────
  "inputs.meta": "ኣቕረብቲ ዘርኢ፣ ማዳበርያን ኬሚካልን ርኸቡ",
  "inputs.description": "ኣብ ጥቓኹም ዘርኢ፣ ማዳበርያን ኬሚካል ዘርእትን ርኸቡ። ንምንጽጻር ክልተ ወይ ልዕሊኡ ኣቕረብቲ ምረጹ።",
  "inputs.myRegion": "ክልለይ ({region})",
  "inputs.productType": "ዓይነት ፍርያት",
  "inputs.allProducts": "ኩሎም ፍርያት",
  "inputs.searchPlaceholder": "ኣቕራቢ፣ ፍርያት ወይ ምልክት ንግዲ",
  "inputs.compare1": "{n} ኣቕራቢ ኣነጻጽር",
  "inputs.compareN": "{n} ኣቕረብቲ ኣነጻጽር",
  "inputs.tickMore": "ንምንጽጻር እንተወሓደ ሓደ ተወሳኺ ኣቕራቢ ምረጹ።",
  "inputs.tellNeed": "ዝበለጸ መልሲ ንምርካብ እትደልይዎ ንገሩና (ኣማራጺ)።",
  "inputs.clear": "ኣጽሪ",
  "inputs.whatNeed": "እንታይ ትደልዩ?",
  "inputs.needPlaceholder": "ንኣብነት ማዳበርያ DAP ን2 ሄክታር ጣፍ",
  "inputs.compare": "ኣነጻጽር",
  "inputs.finding": "ኣቕረብቲ ይድለዩ ኣለዉ…",
  "inputs.none": "ኣቕራቢ ኣይተረኽበን",
  "inputs.noneHint": "ካልእ ክልል ወይ ዓይነት ፍርያት ፈትኑ፣ ወይ ድለያ ኣጽርዩ።",
  "inputs.kmAway": "{n} ኪ.ሜ ርሒቑ",
  "inputs.stock": "ክዝና፦ {stock}",
  "inputs.showAll": "ኩሎም {n} ፍርያት ኣርኢ",

  // ── Financial ──────────────────────────────────────────────────────────
  "fin.meta": "ነጥቢ ልቓሕኩምን ኣማራጺታት ልቓሕን",
  "fin.description": "ነጥቢ ልቓሕ ግራትኩምን ክትሓቱሎም እትኽእሉ ልቓሓትን ርኣዩ። እቲ ነጥቢ ኣብ መግለጺ ርእስኹም ዘሎ ሓበሬታ ጥራይ ይጥቀም።",
  "fin.band.strong": "ሓያል",
  "fin.band.good": "ጽቡቕ",
  "fin.band.fair": "ማእከላይ",
  "fin.band.needsWork": "ምምሕያሽ የድልዮ",
  "fin.tip.farms": "ግራውትኹም ኣብ መግለጺ ርእሰይ መዝግቡ (+10 ነጥቢ)።",
  "fin.tip.region": "ክልልኩም ኣብ መግለጺ ርእሰይ ምረጹ (+5 ነጥቢ)።",
  "fin.tip.zone": "ዞባኹም ኣብ መግለጺ ርእሰይ ወስኹ (+3 ነጥቢ)።",
  "fin.tip.size": "ስፍሓት ነፍሲ ወከፍ ግራት (ብሄክታር) ኣእትዉ (ካብ +3 ክሳብ +7 ነጥቢ)።",
  "fin.tip.resolve": "ቅናሳት ንምእላይ ጸገማት ዘርእቲ ኣሕክሙ እሞ ጸብጻባት ጥዕና ከም ዝተፈትሑ ምልክት ግበሩ።",
  "fin.tip.track": "ታሪኽ ንምህናጽ መርመራ ጥዕና ዘርእቲ ተጠቐሙ እሞ ተኸታተሉ (+5 ነጥቢ)።",
  "fin.yourScore": "ነጥቢ ልቓሕኩም",
  "fin.calculating": "ነጥብኹም ይሕሰብ ኣሎ…",
  "fin.whatAffects": "ንነጥብኹም ዝጸልዉ ነገራት",
  "fin.helping": "ዝሕግዙኹም",
  "fin.holdingBack": "ንድሕሪት ዝሕዙኹም",
  "fin.loans": "ክትሓቱሎም እትኽእሉ ልቓሓት",
  "fin.loansHint": "ካብ ዝተሓተ ወለድ ጀሚሩ ዝተሰርዐ። ወርሓዊ ክፍሊት ንምሉእ መጠን እዩ።",
  "fin.findingLoans": "ኣማራጺታት ልቓሕ ይድለዩ ኣለዉ…",
  "fin.noLoans": "ክሳብ ሕጂ ዝሰማማዕ ልቓሕ የለን",
  "fin.noLoansHint": "ተወሳኺ ኣማራጺታት ልቓሕ ንምርካብ ነጥብኹም ኣመሓይሹ።",
  "fin.notYet": "ገና ኣይርከቡልኩምን",
  "fin.scoreAria": "ነጥቢ ልቓሕ {score} ካብ 100",
  "fin.outOf100": "ካብ 100",
  "fin.raise": "ነጥብኹም ብኸመይ ከተልዕሉ ትኽእሉ",
  "fin.updateProfile": "መግለጺ ርእሰይ ኣሐድስ",
  "fin.nothingYet": "ክሳብ ሕጂ ዋላ ሓደ የለን።",
  "fin.nothingWellDone": "ዋላ ሓደ የለን — ጽቡቕ ስራሕ።",
  "fin.notForRole": "ንዓይነት ሕሳብኩም ኣይቀርብን",
  "fin.needsPoints": "{n} ተወሳኺ ነጥቢ የድሊ",
  "fin.upTo": "ክሳብ",
  "fin.interest": "ወለድ",
  "fin.perYear": "{rate}% ብዓመት",
  "fin.months": "{n} ኣዋርሕ",
  "fin.monthly": "ወርሓዊ",
  "fin.factor.farm_records": "ዝተመዝገቡ ሓበሬታ ግራት",
  "fin.factor.farm_records.detail": "{value} ግራት(ውቲ) ተመዝጊቦም",
  "fin.factor.region": "ምዝገባ ክልል",
  "fin.factor.region.detail": "ኣብ {value} ዝተመዝገበ",
  "fin.factor.zone": "ምዝገባ ዞባ",
  "fin.factor.zone.detail": "ዞባ፦ {value}",
  "fin.factor.critical_reports": "ዘይተፈትሑ ኣሻቐልቲ ጸብጻባት ሕማም",
  "fin.factor.critical_reports.detail": "{value} ኣሻቃሊ ጸብጻብ(ታት) ጥዕና ክፉት እዮም",
  "fin.factor.moderate_reports": "ንጡፋት መጠንቀቕታታት ሕማም",
  "fin.factor.moderate_reports.detail": "{value} ማእከላይ ጸብጻብ(ታት) ክትትል ይጽበዩ",
  "fin.factor.track_record": "ናይ ቀደም ታሪኽ",
  "fin.factor.track_record.detail": "{value} ዝተፈትሑ ጸብጻብ(ታት) ጥዕና",
  "fin.factor.farm_scale": "ስፍሓት ግራት",
  "fin.factor.farm_scale.detail": "{value} ሄክታር ዝተመዝገበ መሬት ሕርሻ",
  "fin.factor.smallholder": "ንእሽቶ ግራት",
  "fin.factor.smallholder.detail": "{value} ሄክታር ተመዝጊቡ",

  // ── My profile ─────────────────────────────────────────────────────────
  "profile.meta": "ሕሳብኩምን ግራውትኹምን",
  "profile.description": "ዋጋታትን ምኽርታትን ምስ ከባቢኹም ንኽሰማምዑ ሓበሬታኹም ወቕታዊ ግበሩ።",
  "profile.nameEmpty": "ስም ባዶ ክኸውን ኣይክእልን።",
  "profile.saved": "መግለጺ ርእስኹም ተዓቂቡ።",
  "profile.personal": "ውልቃዊ ሓበሬታ",
  "profile.phoneHint": "ቁጽሪ ቴሌፎንኩም መእተዊኹም ስለ ዝኾነ ክቕየር ኣይክእልን።",
  "profile.regionLocked": "ኣብዚ ክልል ዘለዉ ሓረስቶት ትድግፉ። ንምቕያሩ ኣመሓዳሪ ሕተቱ።",
  "profile.legacyAddress": "ዝተዓቀበ ኣድራሻ፦ {address}። ኩነታት ኣየርን መጠንቀቕታታትን ቅኑዕ ቦታ ንኽጥቀሙ ካብቲ ዝርዝር ምረጽዎ።",
  "profile.farmsHint": "እትሓርስዎም ግራውቲ። ንመርመራ ጥዕና ዘርእትን ንነጥቢ ልቓሕኩምን ይጥቀሙሎም።",
  "profile.addFarm": "ግራት ወስኽ",
  "profile.firstField": "ንምጅማር ቀዳማይ ግራትኩም መዝግቡ።",
  "profile.area": "ስፍሓት",
  "profile.planted": "ዝተዘርኣሉ",
  "profile.deleteTitle": "እዚ ግራት ይደምሰስ ድዩ?",
  "profile.deleteMessage": "\"{name}\"ን ዝርዝራቱን ክድምሰሱ እዮም። እዚ ክምለስ ኣይክእልን።",
  "profile.fieldRequired": "ስም ግራትን ዘርእን የድልዩ።",
  "profile.areaPositive": "ስፍሓት ካብ ዜሮ ዝበልጽ ቁጽሪ ሄክታር ክኸውን ኣለዎ።",
  "profile.editFarm": "ግራት ኣመሓይሽ",
  "profile.oneField": "ብዛዕባ ሓደ እትሓርስዎ ግራት ንገሩና።",
  "profile.fieldName": "ስም ግራት",
  "profile.fieldNamePlaceholder": "ንኣብነት ናይ ሰሜን ግራት",
  "profile.cropPlaceholder": "ንኣብነት ጣፍ",
  "profile.areaHa": "ስፍሓት (ሄክታር)",
  "profile.plantingDate": "ዕለት ዘርኢ",
  "profile.condition": "ኩነታት",
  "profile.notes": "መዘኻኸሪ",
  "profile.notesPlaceholder": "ብዛዕባ እዚ ግራት ክዝከር ዘለዎ ነገር",

  // ── Users (admin) ──────────────────────────────────────────────────────
  "users.meta": "ተጠቀምቲ መድረኽ ኣመሓድሩ",
  "users.description": "ሕሳብ Agri-Stack 360 ዘለዎም ኩሎም። ተጠቃሚ ንምምሕያሽ ወይ መሕለፊ ቃሉ ንምቕያር ተግባራት ተጠቐሙ።",
  "users.total": "ጠቕላላ ተጠቀምቲ",
  "users.farms": "ዝተመዝገቡ ግራውቲ",
  "users.openReports": "ክፉታት ጸብጻባት ጥዕና",
  "users.resolvedReports": "ዝተፈትሑ ጸብጻባት ጥዕና",
  "users.all": "ኩሎም ተጠቀምቲ",
  "users.search": "ስም፣ ቴሌፎን ወይ ክልል ድለዩ",
  "users.filterRole": "ብተራ ኣጻሪ",
  "users.allRoles": "ኩሎም ተራታት",
  "users.noMatch": "ዝሰማማዕ ተጠቃሚ የለን",
  "users.noMatchHint": "ድለያ ወይ መጻረዪ ተራ ኣጽርዩ።",
  "users.farmsCol": "ግራውቲ",
  "users.joined": "ዝተጸንበረሉ",
  "users.agentRegionHint": "ሰራሕተኛታት ልምዓት ዝርእዩ ግራውቲ ክልሎም ጥራይ እዩ",
  "users.regionFor": "ክልል {name}",
  "users.noRegion": "ክልል የለን",
  "users.savedNotice": "ሓበሬታ {name} ተዓቂቡ።",
  "users.passwordNotice": "ን{name} ሓድሽ መሕለፊ ቃል ተዳልዩ። ብኣካል ወይ ብቴሌፎን ሃብዎም።",
  "users.reactivateQ": "{name} ደጊሙ ይንጠፍ ድዩ?",
  "users.deactivateQ": "{name} ይእገድ ድዩ?",
  "users.deactivateBody": "ካብ ሕሳብ ይወጹ፤ ሕሳብ ደጊሙ ክሳብ ዝኽፈት ክኣትዉ ኣይክእሉን።",
  "users.reactivateBody": "ደጊሞም ክኣትዉ ይኽእሉ።",
  "users.deactivate": "ኣግድ",
  "users.reactivate": "ደጊምካ ኣንጥፍ",
  "users.actionsFor": "ተግባራት ን{name}",
  "users.editUser": "ተጠቃሚ ኣመሓይሽ",
  "users.resetPassword": "መሕለፊ ቃል ቀይር",
  "users.agentNeedsRegion": "ሰራሕተኛታት ልምዓት ክልል የድልዮም — ዝርእዩ ግራውቲ ክልሎም ጥራይ እዩ።",
  "users.joinedOn": "ዝተጸንበረ {date}",
  "users.lastSignIn": "ዳሕራይ ዝኣተወ {date}",
  "users.neverSignedIn": "ክሳብ ሕጂ ኣይኣተወን",
  "users.phoneHint": "ቁጽሪ ቴሌፎን መእተዊኦም ስለ ዝኾነ ክቕየር ኣይክእልን።",
  "users.ownRole": "ናይ ባዕልኹም ተራ ክትቕይሩ ኣይትኽእሉን።",
  "users.legacyAddress": "ዝተዓቀበ ኣድራሻ፦ {address}። ወግዓዊ ኮድ ቦታ ንምዕቃብ ካብቲ ዝርዝር ምረጽዎ።",
  "users.accountActive": "ሕሳብ ንጡፍ እዩ",
  "users.accountOff": "ሕሳብ ተኣጊዱ",
  "users.changingRole": "ተራ ናብ {role} ምቕያር",
  "users.takesEffect": "ለውጢ ምስ ዓቀብኩሞ ብቕጽበት ይትግበር።",
  "users.gains": "ዝረኽቦ፦ {list}።",
  "users.loses": "ዝስእኖ፦ {list}።",
  "users.deactivateWarn": "ምዕቃብ ካብ ሕሳብ የውጽኦም። ሕሳብ ደጊሙ ክሳብ ዝኽፈት ክኣትዉ ኣይክእሉን።",
  "users.setNewFor": "ን{name} ({phone}) ሓድሽ መሕለፊ ቃል ኣዳልዉ።",
  "users.newPassword": "ሓድሽ መሕለፊ ቃል",
  "users.generate": "ባዕሉ ፍጠር",
  "users.giveInPerson": "ሓድሽ መሕለፊ ቃል ብኣካል ወይ ብቴሌፎን ሃብዎም። ናይ ቀደም መሕለፊ ቃሎም ብቕጽበት ምስራሕ የቋርጽ።",
  "users.setPassword": "ሓድሽ መሕለፊ ቃል ዓቅብ",

  // ── Permissions and role descriptions ──────────────────────────────────
  "permArea.market": "ዕዳጋን ምኽርን",
  "permArea.farms": "ግራውትን ጥዕና ዘርእትን",
  "permArea.inputs": "እታዋትን ፋይናንስን",
  "perm.market_read": "ዋጋታት ዕዳጋን ትንበያታትን ምርኣይ",
  "perm.market_read.desc": "ሰሙናዊ ዋጋታት፣ ምንጽጻር ክልላት፣ ሰሌዳ ዕዳጋን ትንበያታት ዋጋን።",
  "perm.advisory_use": "ኣማኻሪ AI ምጥቃም",
  "perm.advisory_use.desc": "ብዛዕባ ዋጋ፣ መሸጣን ሕርሻን ንኣማኻሪ AI ምሕታት።",
  "perm.profile_manage": "ናይ ገዛእ ርእሲ መግለጺ ምምሕያሽ",
  "perm.profile_manage.desc": "ናይ ገዛእ ርእሲ ስም፣ ዞባ፣ ወረዳን ቋንቋን ምቕያር።",
  "perm.farms_manage_own": "ናይ ገዛእ ርእሲ ግራውቲ ምምዝጋብን ምምሕያሽን",
  "perm.farms_manage_own.desc": "ናቶም ግራውቲ ምፍጣር፣ ምምሕያሽን ምድምሳስን።",
  "perm.farms_read_region": "ኣብ ክልል ገዛእ ርእሲ ዘለዉ ግራውቲ ምርኣይ",
  "perm.farms_read_region.desc": "ዋናታቶም ኣብ ሓደ ክልል ዘለዉ ኩሎም ግራውቲ ምርኣይ። ክልሎም ብኣመሓዳሪ ይምደብ።",
  "perm.farms_manage_all": "ኩሎም ግራውቲ ምርኣይን ምምሕያሽን",
  "perm.farms_manage_all.desc": "ኣብ መድረኽ ዘሎ ዝኾነ ግራት ምርኣይን ምቕያርን።",
  "perm.crop_health_use": "መርመራ ጥዕና ዘርእቲ ምክያድ",
  "perm.crop_health_use.desc": "ኣብ ዝርእዩዎም ግራውቲ ጸገማት ምምርማር፣ ጸብጻባት ጥዕና ምዕቃብን ከም ዝተፈትሑ ምልክት ምግባርን።",
  "perm.inputs_read": "ኣቕረብቲ እታዋት ምርኣይ",
  "perm.inputs_read.desc": "ኣቕረብቲ ዘርኢ፣ ማዳበርያን ኬሚካልን ምርካብን ብAI ምንጽጻርን።",
  "perm.financial_read": "ነጥቢ ልቓሕን ልቓሓትን ምርኣይ",
  "perm.financial_read.desc": "ነጥቢ ልቓሕ ግራቶምን ዝሰማምዑ ፍርያት ልቓሕን ምርኣይ።",
  "perm.users_manage": "ተጠቀምትን ተራታትን ምምሕዳር",
  "perm.users_manage.desc": "ተጠቀምቲ ምዝርዛር፣ ተራን ክልልን ምቕያር፣ ሕሳባት ምንጣፍ ወይ ምእጋድ።",
  "perm.platform_stats": "ስታቲስቲክስ መድረኽ ምርኣይ",
  "perm.platform_stats.desc": "ድምር ተጠቀምቲ፣ ግራውትን ጸብጻባት ጥዕናን ምርኣይ።",
  "perm.sync_manage": "ምስምማዕ ሓበሬታ ምክያድ",
  "perm.sync_manage.desc": "ካብ nmis.et ሓደሽቲ ዋጋታት ምውራድ፣ መዓልታዊ መደብ ምድላውን ታሪኽ ምስምማዕ ምርኣይን።",
  "perm.models_retrain": "ሞዴላት ትንበያ ደጊምካ ምስልጣን",
  "perm.models_retrain.desc": "ሞዴላት ትንበያ ዋጋ ደጊምካ ምስልጣን ምጅማር።",
  "perm.knowledge_manage": "ማእከል ፍልጠት ምኽሪ ምምሕዳር",
  "perm.knowledge_manage.desc": "ኣማኻሪ AI ዝምልሰሎም ሰነዳት መምርሒ ምጽዓን፣ ምምዳብ፣ ናብ መዝገብ ምእታውን ደጊምካ ምምልካትን።",
  "perm.advisory_admin": "ምኽሪ AI ምምሕዳር",
  "perm.advisory_admin.desc": "ደረታት ምኽሪ ምቕያር፣ ስርዓት መጠንቀቕታ ምክያድን ዝተሰጋገሩ ጉዳያት ምግምጋምን።",
  "role.farmer.desc": "ዘርኢ የፍሪ። ናቱ ግራውቲ የመሓድር፣ ጥዕና ዘርእቲ ይምርምር፣ ኣቕረብቲ እታዋት የነጻጽር፣ ኣማራጺታት ልቓሕ ይርኢ።",
  "role.agent.desc": "ኣብ ክልሉ ዘለዉ ሓረስቶት ይድግፍ፦ ግራውቶም ይርኢ፣ መርመራ ጥዕና ዘርእቲ የካይደሎም።",
  "role.trader.desc": "ፍርያት ይዕድግን ይሸይጥን። ዋጋታት ዕዳጋ ይከታተል፣ ኣቕረብቲ እታዋት የነጻጽር፣ ኣማራጺታት ልቓሕ ይርኢ።",
  "role.admin.desc": "መድረኽ የመሓድር። ምምሕዳር ተጠቀምቲ፣ ተራታትን ምስምማዕ ሓበሬታን ሓዊሱ ኩሉ ፍቓድ ኣለዎ።",

  // ── Roles and permissions pages ────────────────────────────────────────
  "roles.meta": "ነፍሲ ወከፍ ተራ ንምንታይ ምዃኑን እንታይ ክገብር ከም ዝኽእልን",
  "roles.description": "ነፍሲ ወከፍ ሕሳብ ሓደ ተራ ኣለዎ። ተራ ሓደ ሰብ ኣየናይ ገጻት ከም ዝርኢን እንታይ ክገብር ከም ዝፍቀደሉን ይውስን።",
  "roles.loading": "ተራታት ይጽዕን ኣሎ…",
  "roles.howGiven": "ተራታት ብኸመይ ይወሃቡ",
  "roles.howGivenBody": "ሓረስቶትን ነጋዶን ምስ ተመዝገቡ ተራኦም ይመርጹ። ሰራሕተኛታት ልምዓትን ኣመሓደርትን ሓበሬታ ካልኦት ክርእዩ ስለ ዝኽእሉ፣ ነዞም ተራታት ክህብ ዝኽእል ኣመሓዳሪ ጥራይ እዩ፤ ኣብ ገጽ ተጠቀምቲ።",
  "roles.openUsers": "ተጠቀምቲ ክፈት",
  "roles.openSignup": "ክፉት ምዝገባ",
  "roles.byAdmin": "ብኣመሓዳሪ ዝወሃብ",
  "roles.people": "እዚ ተራ ዘለዎም ሰባት",
  "roles.activeCount": "{n} ንጡፋት",
  "roles.areas": "{n} ዓውድታት",
  "roles.viewUsers": "ተጠቀምቲ ርአ፦ {role}",
  "roles.compareAll": "ኩሎም ፍቓዳት ኣነጻጽር",
  "perms.meta": "ነፍሲ ወከፍ ፍቓድን ዘለዎም ተራታትን",
  "perms.description": "ሓደ ሰብ ክገብሮ ዝፍቀደሉ ኩሉን ዝፈቕዱ ተራታትን። ሰርቨር ነዚኦም ኣብ ነፍሲ ወከፍ ሕቶ የረጋግጾም።",
  "perms.search": "ፍቓዳት ድለዩ",
  "perms.loading": "ፍቓዳት ይጽዕን ኣሎ…",
  "perms.noMatch": "ዝሰማማዕ ፍቓድ የለን",
  "perms.noMatchHint": "ካልእ ቃል ፈትኑ።",
  "perms.footer": "ሓደ ሰብ ዝኽእሎ ንምቕያር ኣብ ገጽ ተጠቀምቲ ተራኡ ቀይሩ። ፍቓዳት ዝተገልጹ ኣብ",
  "perms.count1": "{n} ፍቓድ",
  "perms.countN": "{n} ፍቓዳት",
  "perms.permission": "ፍቓድ",
  "perms.allowed": "{role}፦ ተፈቒዱ",
  "perms.notAllowed": "{role}፦ ኣይተፈቕደን",

  // ── Knowledge base (admin) ─────────────────────────────────────────────
  "kb.meta": "ኣማኻሪ ዝምልሰሎም ሰነዳት መምርሒ",
  "kb.description": "ኣማኻሪ AI ዝምልሰሎም መምርሒታት ሚኒስትሪ ሕርሻ። ናብ መዝገብ ዝኣተዉ ሰነዳት ደሓር ኣይጥቀሙሎምን።",
  "kb.detect": "ባዕሉ ይፍለ",
  "kb.mixed": "ሕዋስ",
  "kb.embeddedPartial": "{n} ክፋላት ተመልኪቶም፤ {left} ገና ይጽበዩ ኣለዉ።",
  "kb.embedded": "{n} ክፋላት ተመልኪቶም።",
  "kb.allEmbedded": "ኩሎም ክፋላት ቅድሚ ሕጂ ተመልኪቶም።",
  "kb.reindex": "ደጊምካ ኣመልክት",
  "kb.uploadPdf": "PDF ጽዓን",
  "kb.activeDocs": "ንጡፋት ሰነዳት",
  "kb.passages": "ክፋላት",
  "kb.readyMeaning": "ንድለያ ትርጉም ድሉው",
  "kb.documents": "ሰነዳት",
  "kb.noDocs": "ክሳብ ሕጂ ሰነድ የለን",
  "kb.noDocsHint": "ፓኬጃት ፍርያትን መምርሒታትን ሚኒስትሪ ሕርሻ ብPDF ጽዓኑ።",
  "kb.title": "ኣርእስቲ",
  "kb.crops": "ዘርእቲ",
  "kb.pages": "ገጻት",
  "kb.added": "ዝተወሰኸሉ",
  "kb.embeddedOf": "{n}/{total} ተመልኪቶም",
  "kb.inUse": "ኣብ ጥቕሚ",
  "kb.archived": "ኣብ መዝገብ",
  "kb.archive": "ናብ መዝገብ ኣእቱ",
  "kb.restore": "መልስ",
  "kb.addedNotice": "\"{title}\" ተወሲኹ፦ {pages} ገጻት፣ {chunks} ክፋላት።",
  "kb.ocrSkipped": "ገጻት {pages} ጽሑፍ የብሎምን (ዝተቓኘዉ እዮም) ስለዚ ተዘሊሎም።",
  "kb.test": "ሕቶ ፈትኑ",
  "kb.testHint": "ኣማኻሪ ቅድሚ ምምላሱ ኣየኖት ክፋላት ከም ዘንብብ ርኣዩ።",
  "kb.testPlaceholder": "ንኣብነት ዩሪያ መዓስ ይውሰኽ?",
  "kb.noPassages": "ክፋል ኣይተረኽበን።",
  "kb.wordRank": "ቃል #{n}",
  "kb.meaningRank": "ትርጉም #{n}",
  "kb.choosePdf": "ፋይል PDF ምረጹ።",
  "kb.pdfOnly": "PDF ጽዓኑ። ቁጽሪ ገጻት ንኽጥቀስ ሰነዳት Word ቅድም ብPDF ዓቅብዎም።",
  "kb.titleCropsRequired": "ኣርእስትን ዘርእትን የድልዩ።",
  "kb.uploadTitle": "መምርሒ ጽዓን",
  "kb.uploadHint": "PDF ብክፋላት ተመቒሉ ይምልከት። ዓበይቲ መምርሒታት ሓደ ደቒቕ ይወስዱ።",
  "kb.pdfFile": "ፋይል PDF",
  "kb.version": "ሕታም",
  "kb.sourceLink": "መራኸቢ ምንጪ (ኣማራጺ)",
  "kb.upload": "ጽዓን",

  // ── Data sync (admin) ──────────────────────────────────────────────────
  "sync.meta": "ዋጋታት ዕዳጋ ወቕታዊ ግበሩ",
  "sync.description": "ናይ ቀረባ ግዜ ዋጋታት ካብ nmis.et ኣውርዱ እሞ ትንበያታት ወቕታዊ ግበሩ።",
  "sync.status.running": "ይካየድ ኣሎ",
  "sync.status.success": "ተዛዚሙ",
  "sync.status.partial": "ምስ ጉድለታት ተዛዚሙ",
  "sync.status.failed": "ኣይሰለጠን",
  "sync.status.cancelled": "ደው ኢሉ",
  "sync.status.interrupted": "ተቛሪጹ",
  "sync.retrain.running": "ይሕደስ ኣሎ",
  "sync.retrain.success": "ተሓዲሱ",
  "sync.retrain.skipped": "ኣየድለየን",
  "sync.phase.starting": "ይጅምር ኣሎ",
  "sync.phase.catalog": "ሓደሽቲ ዕዳጋታት ይርኢ ኣሎ",
  "sync.phase.prices": "ዋጋታት የውርድ ኣሎ",
  "sync.phase.export": "ፋይል CSV ይጽሕፍ ኣሎ",
  "sync.phase.retrain": "ትንበያታት ዋጋ የሐድስ ኣሎ",
  "sync.full": "ምሉእ",
  "sync.quick": "ቅልጡፍ",
  "sync.unreachable": "ኣገልግሎት ምስምማዕ ሓበሬታ ክርከብ ኣይከኣለን",
  "sync.livePaused": "ቀጥታዊ ኩነታት ደው ኢሉ፦ {error}",
  "sync.latestDate": "ናይ ቀረባ ግዜ ዕለት ዋጋ",
  "sync.dayAgo": "ቅድሚ {n} መዓልቲ",
  "sync.daysAgo": "ቅድሚ {n} መዓልታት",
  "sync.priceRecords": "መዛግብ ዋጋ",
  "sync.since": "ካብ {date}",
  "sync.marketsCrops": "ዕዳጋታት · ዘርእቲ",
  "sync.varieties": "{n} ዓሌታት",
  "sync.forecastData": "ትንበያታት ዝጥቀምሉ ሓበሬታ ክሳብ",
  "sync.retrained": "ደጊሙ ዝሰልጠነ {date}",
  "sync.runStopped": "ስራሕ #{id} ደው ኢሉ",
  "sync.runInterrupted": "ስራሕ #{id} ተቛሪጹ",
  "sync.resumeHint": "ካብ {total} ጽምዲታት {done} ወሪዶም። ዝተረፈ ንምውራድ ቀጽሉ።",
  "sync.resume": "ቀጽል",
  "sync.history": "ታሪኽ ምስምማዕ",
  "sync.historyHint": "ዝርዝሩን መዝገቡን ንምርኣይ ሓደ ስራሕ ጠውቑ።",
  "sync.noRuns": "ክሳብ ሕጂ ምስምማዕ ኣይተኻየደን",
  "sync.noRunsHint": "ቀዳማይ ምስምማዕ ኣብ ላዕሊ ጀምሩ።",
  "sync.col.run": "ስራሕ",
  "sync.col.started": "ዝጀመረሉ",
  "sync.col.type": "ዓይነት",
  "sync.col.pairs": "ጽምዲታት",
  "sync.col.duration": "ዝወሰዶ ግዜ",
  "sync.newPrices": "ሓደሽቲ ዋጋታት",
  "sync.forecasts": "ትንበያታት",
  "sync.running": "ምስምማዕ #{id} ይካየድ ኣሎ — {scope} ምስምማዕ",
  "sync.stopping": "ደው የብል ኣሎ…",
  "sync.stop": "ምስምማዕ ደው ኣብል",
  "sync.eta": "ኣስታት {time} ተሪፉ",
  "sync.startedAt": "ዝጀመረ {date}",
  "sync.stopQ": "እዚ ምስምማዕ ደው ይበል ድዩ?",
  "sync.stopBody": "እቲ ሕጂ ዘሎ ሕቶ ቅድም ይዛዘም። ክሳብ ሕጂ ዝወረደ ኩሉ ይዕቀብ፣ ደሓር ክትቅጽሉ ትኽእሉ።",
  "sync.quickTitle": "ቅልጡፍ ምስምማዕ",
  "sync.quickText": "ኣብ ዝሓለፉ 90 መዓልታት ዝጸብጸቡ ዕዳጋታት",
  "sync.fullTitle": "ምሉእ ምስምማዕ",
  "sync.fullText": "ኩሎም ዝፍለጡ ዕዳጋታት",
  "sync.pairsN": "{n} ጽምዲታት",
  "sync.now": "ሕጂ ኣሰማምዕ",
  "sync.nowHint": "ኣብ ድሕሪት ይሰርሕ — ነዚ ገጽ ክትገድፍዎ ትኽእሉ።",
  "sync.type": "ዓይነት ምስምማዕ",
  "sync.optRetrain": "ድሕሪኡ ትንበያታት ዋጋ ኣሐድስ (1–2 ደቒቕ)",
  "sync.optCatalog": "ዝርዝር ዘርእቲ ነፍሲ ወከፍ ዕዳጋ ደጊምካ ርአ (~15 ደቒቕ ተወሳኺ)",
  "sync.optExport": "ፋይል CSV ደጊምካ ጸሓፍ",
  "sync.start": "{scope} ምስምማዕ ጀምር",
  "sync.scheduleSaved": "መደብ ተዓቂቡ።",
  "sync.auto": "ባዕሉ መዓልታዊ ምስምማዕ",
  "sync.next": "ዝቕጽል፦ {scope} ምስምማዕ ብ{date}",
  "sync.autoOff": "ጠፊኡ — ዋጋታት ዝሕደሱ ብኢድ ምስ ኣሰማማዕኩም ጥራይ እዩ።",
  "sync.on": "ተወሊዑ",
  "sync.off": "ጠፊኡ",
  "sync.time": "ሰዓት (ሰዓት ሰርቨር)",
  "sync.fullOn": "ምሉእ ምስምማዕ ዝካየደሉ መዓልቲ",
  "sync.never": "ፈጺሙ (ቅልጡፍ ምስምማዕ ጥራይ)",
  "sync.optRetrainEach": "ድሕሪ ነፍሲ ወከፍ ምስምማዕ ትንበያታት ዋጋ ኣሐድስ",
  "sync.optCatalogFull": "ኣብ ምሉእ ምስምማዕ ዝርዝራት ዘርእቲ ደጊምካ ርአ",
  "sync.showAdvanced": "ዝለዓሉ ኣማራጺታት ኣርኢ",
  "sync.hideAdvanced": "ዝለዓሉ ኣማራጺታት ሕባእ",
  "sync.rate": "ካልኢታት ኣብ መንጎ ሕቶታት",
  "sync.rateHint": "እቲ ዝተሓተ ቅልጡፍ እዩ ግን ኣብ nmis.et ተወሳኺ ጾር የንብር። ንቡር 1.0 እዩ።",
  "sync.undo": "ምለስ",
  "sync.saveSchedule": "መደብ ዓቅብ",
  "sync.scheduled": "ብመደብ",
  "sync.manual": "ብኢድ",
  "sync.resumes": "#{id} ይቕጽል",
  "sync.runTitle": "ስራሕ ምስምማዕ #{id}",
  "sync.startedBy": "ዝጀመሮ {name}",
  "sync.finished": "ዝተዛዘመሉ",
  "sync.pairsFetched": "ዝወረዱ ጽምዲታት",
  "sync.latestBefore": "ቅድሚኡ ዝነበረ ናይ ቀረባ ዕለት",
  "sync.latestAfter": "ድሕሪኡ ዘሎ ናይ ቀረባ ዕለት",
  "sync.fetchTime": "ግዜ ምውራድ",
  "sync.notRequested": "ኣይተሓተተን",
  "sync.error": "ጌጋ",
  "sync.forecastUpdate": "ምሕዳስ ትንበያ",
  "sync.failedPairs": "ዘይሰለጡ ጽምዲታት ({n}) — ኣብ ዝቕጽል ምስምማዕ ደጊሞም ይፍተኑ",
  "sync.log": "መዝገብ (ናይ መወዳእታ 300 መስመራት)",
  "sync.noLog": "መስመር መዝገብ የለን።",
  "error.requestFailed": "ሕቶ ኣይሰለጠን ({status})",

  // ── AI API keys (admin) ────────────────────────────────────────────────
  "nav.aiKeys": "መፍትሕታት AI",
  "aikeys.meta": "መድረኽ ብተራ ዝጥቀመሎም መፍትሕታት API Gemini",
  "aikeys.description": "መፍትሕታት API Gemini ከምኡ'ውን DeepSeek ወስኹን ኣየናይ AI መልስታት ከም ዝጽሕፍ ምረጹን። ሓደ መፍትሕ ደረቱ ወይ ሕሳቡ ምስ ተወድአ ወይ ምስ ተነጸገ፣ እቲ መድረኽ ባዕሉ ናብ ዝቕጽል መፍትሕ ይቕይር።",  // draft – needs native review
  "aikeys.add": "መፍትሕ ወስኽ",
  "aikeys.usableNow": "ሕጂ ዝሰርሑ መፍትሕታት",
  "aikeys.nextFree": "ዝቕጽል መፍትሕ ዝናጻሉ",
  "aikeys.model": "ሞዴል AI",
  "aikeys.noneUsable": "ሕጂ ዝሰርሕ መፍትሕ AI የለን",
  "aikeys.noneUsableHint": "ኩሎም መፍትሕታት ኮታኦም ወዲኦም፣ የዕርፉ ኣለዉ ወይ ተነጺጎም። ሓደ መፍትሕ ክሳብ ዝናጻ ወይ ሓድሽ ክሳብ እትውስኹ፣ ኣማኻሪ ዝምልሶ ዝተቐድሑ ሕቶታት ጥራይ እዩ።",
  "aikeys.keys": "መፍትሕታት",
  "aikeys.keysHint": "ካብ ላዕሊ ናብ ታሕቲ ይፍተኑ። ስርዓቱ ንምቕያር ምልክታት ተጠቐሙ።",
  "aikeys.none": "ክሳብ ሕጂ መፍትሕ ኣይተወሰኸን",
  "aikeys.noneHint": "ሓደ ክሳብ እትውስኹ፣ መድረኽ ኣብ ፋይል .env ሰርቨር ዘሎ GEMINI_API_KEY ይጥቀም።",
  "aikeys.order": "ስርዓት",
  "aikeys.label": "ስም",
  "aikeys.usesToday": "ሕቶታት ሎሚ",
  "aikeys.lastUsed": "ዳሕራይ ዝተጠቕመሉ",
  "aikeys.enabled": "ኣብ ጥቕሚ",
  "aikeys.moveUp": "ናብ ላዕሊ ኣግዕዝ",
  "aikeys.moveDown": "ናብ ታሕቲ ኣግዕዝ",
  "aikeys.test": "ፈትን",
  "aikeys.reset": "ዳግማይ ጀምር",
  "aikeys.status.unknown": "ገና ኣይተጠቕመሉን",
  "aikeys.status.ok": "ይሰርሕ ኣሎ",
  "aikeys.status.quota": "ኮታ ወዲኡ",
  "aikeys.status.rateLimited": "ደረት ቅልጣፈ",
  "aikeys.status.invalid": "ተነጺጉ",
  "aikeys.status.error": "ጌጋ",
  "aikeys.status.disabled": "ጠፊኡ",
  "aikeys.until": "ክሳብ {date}",
  "aikeys.testOk": "\"{label}\" ይሰርሕ ኣሎ።",
  "aikeys.testFailed": "\"{label}\" ኣይሰርሐን፦ {message}",
  "aikeys.resetDone": "\"{label}\" ደጊሙ ክፍተን እዩ።",
  "aikeys.envTitle": "ካብ ሰርቨር ዝመጽእ ተጠባባቒ መፍትሕ",
  "aikeys.envHint": "ኣብ ፋይል .env ዘሎ GEMINI_API_KEY ድሕሪ ኩሎም ኣብ ላዕሊ ዘለዉ መፍትሕታት ይፍተን።",
  "aikeys.howTitle": "ምቅይያር ብኸመይ ይሰርሕ",
  "aikeys.howBody": "መዓልታዊ ኮታ እንተወዲኡ፦ እቲ መፍትሕ ክሳብ Gemini ዘሐድሰሉ ግዜ የዕርፍ። ደረት ደቒቕ እንተኣጋጢሙ፦ ን Gemini ዝሓቶ ካልኢታት የዕርፍ። ዝተነጸገ መፍትሕ፦ ክሳብ እትፍትንዎ ወይ ዳግማይ እተጀምርዎ ይዝለል። መፍትሕ ምፍታን ካብ ኮታኡ ሓደ ሕቶ ይጥቀም።",
  "aikeys.added": "\"{label}\" ተወሲኹ።",
  "aikeys.deleteQ": "እዚ መፍትሕ ይደምሰስ ድዩ?",
  "aikeys.deleteBody": "\"{label}\" (•••• {last4}) ካብ መድረኽ ክድምሰስ እዩ።",
  "aikeys.deleted": "\"{label}\" ተደምሲሱ።",
  "aikeys.addTitle": "መፍትሕ API Gemini ወስኹ",
  "aikeys.addHint": "ኣቕራቢ ምረጹ፣ ድሕሪኡ መፍትሕ ለጥፉ።",  // draft – needs native review
  "aikeys.labelPlaceholder": "ንኣብነት ፕሮጀክት 2 (ብነጻ)",
  "aikeys.apiKey": "መፍትሕ API",
  "aikeys.storedEncrypted": "እቲ መፍትሕ ተመስጢሩ ይዕቀብ፣ ደጊሙ ኣይርአን፤ ዝርኣያ ናይ መወዳእታ 4 ፊደላት ጥራይ እየን።",
  "aikeys.addInvalid": "ስምን ምሉእ መፍትሕ API ን ኣእትዉ።",

  // ── Text-to-speech ─────────────────────────────────────────────────────
  "tts.listen": "ስምዑ",
  "tts.stop": "ደው ኣብል",
  "tts.loading": "ድምጺ ይዳሎ ኣሎ…",
  "tts.failed": "ድምጺ ኣይርከብን",

  // ── Consent & my data ─────────────────────────────────────────────────────
  "consent.title": "ሓበሬታይን ፍቓደይን",  // draft – needs native review
  "consent.description": "ሓበሬታኹም መን ክርኢ ከም ዝኽእል ንስኹም ትውስኑ። ኣብ ዝኾነ ግዜ ክትቅይሩዎ ትኽእሉ ኢኹም።",  // draft – needs native review
  "consent.data": "ክኢላታት ሕርሻ ግራተይ፣ መርመራታት ዘርእይን ሕቶታተይን ክርእዩ ፍቐድ",  // draft – needs native review
  "consent.dataHint": "ሰራሕተኛ ልምዓት (DA) ንምሕጋዝኩምን ዘርእኹም ጸገም ምስ ዘጋጥሞ ንምብጻሕኩምን ይጥቀመሉ።",  // draft – needs native review
  "consent.alerts": "መጠንቀቕታታትን መዘኻኸሪታትን ስደደለይ",  // draft – needs native review
  "consent.alertsHint": "ኣብ ጥቓ ግራተይ ዘለዉ መጠንቀቕታታት ሕማምን ሕቶታት ክትትል 7 መዓልትን።",  // draft – needs native review
  "consent.legalDraft": "ንድፊ ጽሑፍ፣ ሕጋዊ ገምጋም ይጽበ ኣሎ (ኣዋጅ ሓለዋ ውልቃዊ ሓበሬታ 1321/2024)።",  // draft – needs native review
  "consent.history": "ታሪኽ ለውጢ",  // draft – needs native review
  "consent.noHistory": "ክሳብ ሕጂ ለውጢ የለን።",  // draft – needs native review
  "consent.granted": "ተኸፊቱ",  // draft – needs native review
  "consent.withdrawn": "ተዓጽዩ",  // draft – needs native review
  "consent.kind.data": "ንክኢላታት ምክፋል",  // draft – needs native review
  "consent.kind.alerts": "መጠንቀቕታታት",  // draft – needs native review
  "consent.byOther": "ብ{name} ዝተመዝገበ",  // draft – needs native review
  "consent.download": "ሓበሬታይ ኣውርድ",  // draft – needs native review
  "consent.downloadHint": "እቲ መድረኽ ብዛዕባኹም ዝሕዞ ኩሉ ዘለዎ ፋይል።",  // draft – needs native review
  "consent.saved": "ተዓቂቡ።",  // draft – needs native review
  "signup.consentData": "ክኢላታት ሕርሻ ሓበሬታ ግራተይ ክርእዩ ፍቐድ (ኣማራጺ)",  // draft – needs native review
  "signup.consentAlerts": "መጠንቀቕታታት ሕማምን መዘኻኸሪታትን ስደደለይ (ኣማራጺ)",  // draft – needs native review
  "signup.consentNote": "እዚኣቶም ኣብ ዝኾነ ግዜ ኣብ መግለጺኹም ክትቅይሩዎም ትኽእሉ ኢኹም።",  // draft – needs native review

  // ── DA Copilot ────────────────────────────────────────────────────────────
  "nav.daCopilot": "ሓጋዚ DA",  // draft – needs native review
  "nav.daInbox": "ዝተሰጋገሩ ጉዳያት",  // draft – needs native review
  "perm.da_work": "ከም ሰራሕተኛ ልምዓት ምስራሕ",  // draft – needs native review
  "perm.da_work.desc": "ሓረስቶተይን ዝርዝር ምብጻሕን ምርኣይ፣ ዝተሰጋገሩ ሕቶታት ምምላስ፣ መርመራታት ምርግጋጽን ሓረስቶት ምምዝጋብን።",  // draft – needs native review
  "da.meta": "ሓረስቶትኩምን ቅድሚ ኩሉ ክብጽሑ ዘለዎምን።",  // draft – needs native review
  "da.description": "ሓበሬታኦም ንምክፋል ዝተሰማምዑ ሓረስቶትኩምን ቅድሚ ኩሉ ምብጻሕ ዘድልዮምን።",  // draft – needs native review
  "da.visits": "ቅድሚ ኩሉ ብጽሑ",  // draft – needs native review
  "da.visitsHint": "ብኣድላይነት ዝተሰርዐ፦ ቀዳምነት ዝገደደ ሰብል፣ ቀጺሉ ርግጸኛ ዘይኮኑ መርመራታት ስእሊ፣ ዝሓለፉ ክትትላት፣ ኣብ ጥቓ ዘሎ ለበዳን ዘይተመለሱ ሕቶታትን።",  // draft – needs native review
  "da.noVisits": "ሕጂ ምብጻሕ ዘድልዮ ሰብ የለን።",  // draft – needs native review
  "da.points": "{n} ነጥቢ",  // draft – needs native review
  "da.waitingSince": "ካብ {date} ጀሚሩ ይጽበ ኣሎ",  // draft – needs native review
  "da.reason.worse": "ድሕሪ ምኽሪ ሰብሉ ገዲዱ",  // draft – needs native review
  "da.reason.uncertain_diagnosis": "መርመራ ስእሊ ርግጸኛ ኣይኮነን፣ ናትኩም ምርግጋጽ የድልዮ",  // draft – needs native review
  "da.reason.overdue_follow_up": "ክትትል 7 መዓልቲ ሓሊፉ",  // draft – needs native review
  "da.reason.outbreak_nearby": "ኣብ ጥቓ ለበዳ ሕማም",  // draft – needs native review
  "da.reason.open_question": "መልሲ ዝጽበ ሕቶ",  // draft – needs native review
  "da.farmers": "ሓረስቶተይ",  // draft – needs native review
  "da.farmersHint": "ዝርኣዩ ሓበሬታኦም ምስ ክኢላታት ንምክፋል ዝተሰማምዑ ሓረስቶት ጥራይ እዮም።",  // draft – needs native review
  "da.noFarmers": "ክሳብ ሕጂ ሓረስታይ የለን። ሓረስታይ መዝግቡ፣ ወይ ኣመሓዳሪ ሓረስቶት ክምድበልኩም ሕተቱ።",  // draft – needs native review
  "da.col.farmer": "ሓረስታይ",  // draft – needs native review
  "da.col.crop": "ሰብልን ደረጃን",  // draft – needs native review
  "da.col.lastCheck": "ናይ መወዳእታ መርመራ ስእሊ",  // draft – needs native review
  "da.col.open": "ክፉታት ጉዳያት",  // draft – needs native review
  "da.assignedToMe": "ንዓይ ዝተመደበ",  // draft – needs native review
  "da.day": "መዓልቲ {n}",  // draft – needs native review
  "da.noCrop": "ንጡፍ ወቕቲ ሰብል የለን",  // draft – needs native review
  "da.noCheck": "ክሳብ ሕጂ የለን",  // draft – needs native review
  "da.openCount": "{n} ክፉት",  // draft – needs native review
  "da.overdueCount": "{n} ዝሓለፈ",  // draft – needs native review
  "da.register": "ሓረስታይ መዝግብ",  // draft – needs native review
  "da.registerHint": "ነቲ ኣፕ ንዘይብሎም ሓረስቶት። ክልተ ሕቶታት ፍቓድ ብዓው ኣንብቡ፣ እቲ ሓረስታይ ዝተሰማምዓሉ ጥራይ ምልክት ግበሩ።",  // draft – needs native review
  "da.pin": "ግዝያዊ ቃል ምሕላፍ",  // draft – needs native review
  "da.pinHint": "እንተወሓደ 6 ፊደላት። ነቲ ሓረስታይ ሃብዎ፤ ደሓር ክቕይሮ ይኽእል።",  // draft – needs native review
  "da.kebele": "ቀበሌ (ኣማራጺ)",  // draft – needs native review
  "da.consentDataAsk": "እቲ ሓረስታይ ክኢላታት ሕርሻ ሓበሬታ ግራቱ ክርእዩ ተሰማሚዑ",  // draft – needs native review
  "da.consentAlertsAsk": "እቲ ሓረስታይ መጠንቀቕታታት ሕማምን መዘኻኸሪታትን ይደሊ",  // draft – needs native review
  "da.consentNoData": "ብዘይ እዚ ስምምዕ ድሕሪ ምምዝጋብ ነዚ ሓረስታይ ክትርእይዎ ኣይትኽእሉን።",  // draft – needs native review
  "da.registered": "{name} ተመዝጊቡ።",  // draft – needs native review
  "da.actingFor": "ትሓቱሉ ዘለኹም",  // draft – needs native review
  "da.myself": "ንገዛእ ርእሰይ",  // draft – needs native review
  "da.inboxDescription": "እቲ ኣማኻሪ ክምልሶም ዘይከኣለ ሕቶታትን ሰብ ዘድልዮም ሰብልን።",  // draft – needs native review
  "da.status.open": "ክፉት",  // draft – needs native review
  "da.status.answered": "ተመሊሱ",  // draft – needs native review
  "da.status.forwarded": "ተሰጋጊሩ",  // draft – needs native review
  "da.status.closed": "ተዓጽዩ",  // draft – needs native review
  "da.esc.low_confidence": "መርመራ ስእሊ ርግጸኛ ኣይኮነን",  // draft – needs native review
  "da.esc.no_knowledge": "ኣብ መምርሒታት መልሲ የለን",  // draft – needs native review
  "da.esc.guardrail_block": "ንድሕንነት ደው ኢሉ",  // draft – needs native review
  "da.esc.advice_failed": "ሰብሉ ገዲዱ",  // draft – needs native review
  "da.esc.asked_for_person": "ሰብ ክዛረቦ ሓቲቱ",  // draft – needs native review
  "da.question": "ሕቶ",  // draft – needs native review
  "da.aiAnswer": "መልሲ ኣማኻሪ",  // draft – needs native review
  "da.diagnosis": "መርመራ ስእሊ፦ {disease} ({pct}%)",  // draft – needs native review
  "da.verified": "ብDA ዝተረጋገጸ፦ {disease}",  // draft – needs native review
  "da.verifyLabel": "ኣብቲ ሰብል እንታይ ትርእዩ?",  // draft – needs native review
  "da.verify": "ምርግጋጸይ ዓቅብ",  // draft – needs native review
  "da.answerLabel": "ንሓረስታይ እትህብዎ መልሲ",  // draft – needs native review
  "da.answerHint": "እቲ ሓረስታይ ነዚ ኣብቲ ኣፕ ይርእዮ፤ ክሰምዖ'ውን ይኽእል።",  // draft – needs native review
  "da.send": "መልሲ ስደድ",  // draft – needs native review
  "da.forward": "ናብ ኣመሓዳሪ ኣሰጋግር",  // draft – needs native review
  "da.close": "ዕጸው",  // draft – needs native review
  "da.noEscalations": "ኣብዚ ዋላ ሓንቲ የለን።",  // draft – needs native review
  "da.resolution": "መልሲ ወይ መዘኻኸሪ",  // draft – needs native review
  "da.saved": "ተዓቂቡ።",  // draft – needs native review
  "users.da": "ሰራሕተኛ ልምዓት",  // draft – needs native review
  "users.noDa": "ሰራሕተኛ ኣይተመደበን",  // draft – needs native review

  // ── Crop calendar & seasons ───────────────────────────────────────────────
  "stage.establishment": "ምዝራእን ምብቋልን",  // draft – needs native review
  "stage.tillering": "ምውላድ",  // draft – needs native review
  "stage.stem_elongation": "ምንዋሕ ጉንዲ",  // draft – needs native review
  "stage.heading_flowering": "ምውጻእ ርእስን ምዕምባብን",  // draft – needs native review
  "stage.grain_fill": "ምምላእ ፍረ",  // draft – needs native review
  "stage.maturity": "ምብሳልን ምእካብን",  // draft – needs native review
  "season.meher": "ክረምቲ (ዓቢ ዝናብ)",  // draft – needs native review
  "season.belg": "በልግ (ሓጺር ዝናብ)",  // draft – needs native review
  "season.irrigated": "መስኖ",  // draft – needs native review
  "calendar.title": "ካላንደር ሰብለይ",  // draft – needs native review
  "calendar.description": "ሰብልኹም ሕጂ ኣበይ ከም ዘሎን ቀጺሉ እንታይ ክትገብሩ ከም ዘለኩምን፣ ካብ መምርሒታት ስርናይ ሚኒስትሪ ሕርሻ።",  // draft – needs native review
  "calendar.estimated": "ግምታዊ ግዜ እዩ። ምስ ሰራሕተኛ ልምዓትኩም ኣረጋግጹ።",  // draft – needs native review
  "calendar.planted": "ዝተዘርአ {date}",  // draft – needs native review
  "calendar.day": "ካብ ዝተዘርአ መዓልቲ {n}",  // draft – needs native review
  "calendar.now": "ሕጂ",  // draft – needs native review
  "calendar.tasks": "ኣብዚ ደረጃ እንታይ ክትገብሩ ኣለኩም",  // draft – needs native review
  "calendar.tasksNote": "ዕማማት ከምቲ ኣብ መምርሒታት ሚኒስትሪ ዝተጻሕፈ (ብእንግሊዝኛ) ቀሪቦም።",  // draft – needs native review
  "calendar.next": "ዝቕጽል፦ {stage} ኣብ ውሽጢ {n} መዓልቲ",  // draft – needs native review
  "calendar.pastLast": "እዚ ሰብል ናይ መወዳእታ ደረጃ ካላንደር ሓሊፉ። ኣብ መግለጺየ ከም ዝተኣከበ ምልክት ግበሩ።",  // draft – needs native review
  "calendar.unknown": "ነዚ ሰብልን ቦታን ክሳብ ሕጂ ካላንደር ሰብል የለን።",  // draft – needs native review
  "calendar.empty": "እንታይን መዓስን ከም ዝዘራእኩም ንገሩና፤ እቲ ካላንደር ደረጃን ዕማማትን ሰብልኹም ከርኢ እዩ።",  // draft – needs native review
  "calendar.addSeason": "ዝዘራእክዎ ወስኽ",  // draft – needs native review
  "calendar.source": "ምንጪ፦ {source}",  // draft – needs native review
  "seasons.button": "ወቕትታት",  // draft – needs native review
  "seasons.title": "ወቕትታት ሰብል፦ {field}",  // draft – needs native review
  "seasons.hint": "ኣብ ሓደ ግራት ኣብ ሓደ እዋን ሓደ ሰብል ጥራይ። ምስ ወዳእኩም ከም ዝተኣከበ ምልክት ግበሩ።",  // draft – needs native review
  "seasons.none": "ክሳብ ሕጂ ወቕቲ ሰብል የለን።",  // draft – needs native review
  "seasons.crop": "ሰብል",  // draft – needs native review
  "seasons.variety": "ዓሌት (ኣማራጺ)",  // draft – needs native review
  "seasons.planted": "ዕለት ምዝራእ",  // draft – needs native review
  "seasons.kind": "ወቕቲ",  // draft – needs native review
  "seasons.harvest": "ዝጽበ እዋን ምእካብ (ኣማራጺ)",  // draft – needs native review
  "seasons.add": "ወቕቲ ወስኽ",  // draft – needs native review
  "seasons.markHarvested": "ከም ዝተኣከበ ምልክት ግበር",  // draft – needs native review
  "seasons.status.active": "ይዓቢ ኣሎ",  // draft – needs native review
  "seasons.status.harvested": "ተኣኪቡ",  // draft – needs native review
  "seasons.status.failed": "ኣይተዓወተን",  // draft – needs native review
  "seasons.growing": "ሕጂ ዝዓቢ ዘሎ፦ {crop} ካብ {date}",  // draft – needs native review

  // ── Advisory settings, monitoring, audit log ──────────────────────────────
  "nav.advisorySettings": "ቅጥዕታት ምኽሪ",  // draft – needs native review
  "nav.monitoring": "ክትትል",  // draft – needs native review
  "nav.auditLog": "መዝገብ ኦዲት",  // draft – needs native review
  "perm.audit_read": "መዝገብ ኦዲት ምንባብ",  // draft – needs native review
  "perm.audit_read.desc": "ኣብ ምምሕዳር መን እንታይ ከም ዝቐየረ፣ መን ሓበሬታ ሓረስቶት ከም ዝኸፈተን ምርኣይ።",  // draft – needs native review
  "settings.description": "እቲ ኣማኻሪ ንመርመራ ስእሊ፣ መጠንቀቕታ ለበዳን ደረት መጠንቀቕታን ዝጥቀመሎም መለክዒታት። ለውጥታት ብኡንብኡ ይሰርሑ።",  // draft – needs native review
  "settings.note": "እዚኣቶም ውሳነታት ፍርያት እዮም እምበር ሓቅታት ሳይንስ ሕርሻ ኣይኮኑን። ለውጥታት ምስ ጉጅለ ክኢላታት ሕርሻ ተሰማምዑሎም።",  // draft – needs native review
  "settings.allowed": "ዝተፈቕደ፦ ካብ {min} ክሳብ {max}",  // draft – needs native review
  "settings.default": "ነባሪ፦ {value}",  // draft – needs native review
  "settings.save": "ዓቅብ",  // draft – needs native review
  "settings.saved": "ተዓቂቡ፦ {name}።",  // draft – needs native review
  "settings.on": "ክፉት",  // draft – needs native review
  "settings.off": "ዕጹው",  // draft – needs native review
  "settings.diagnosis_confidence_threshold": "መርመራ ስእሊ፦ ዝተሓተ ርግጸኛነት",  // draft – needs native review
  "settings.diagnosis_confidence_threshold.hint": "ትሕቲ እዚ ርግጸኛነት (0 ክሳብ 1) እንተኾይኑ መርመራ ስእሊ ከም ዘይርግጸኛ ተቖጺሩ ናብ DA ይለኣኽ።",  // draft – needs native review
  "settings.follow_up_days": "ክትትል ድሕሪ (መዓልትታት)",  // draft – needs native review
  "settings.follow_up_days.hint": "ሰብሉ ከም ዝተመሓየሸ ቅድሚ ምሕታት ድሕሪ መርመራ ስእሊ ዘለዉ መዓልትታት።",  // draft – needs native review
  "settings.outbreak_radius_km": "ራድየስ ለበዳ (ኪ.ሜ)",  // draft – needs native review
  "settings.outbreak_radius_km.hint": "መርመራታት ሕማም ናይ ጎረባብቲ ዝቑጸሩሉ ርሕቀት።",  // draft – needs native review
  "settings.outbreak_window_days": "ንድሕሪት ዝረኣዩ መዓልትታት (ለበዳ)",  // draft – needs native review
  "settings.outbreak_window_days.hint": "ኣብዘን ቀረባ መዓልትታት ዘለዉ መርመራታት ጥራይ ይቑጸሩ።",  // draft – needs native review
  "settings.outbreak_min_scans": "መጠንቀቕታ ዘለዓዕሉ መርመራታት",  // draft – needs native review
  "settings.outbreak_min_scans.hint": "ኣብ ውሽጢ ራድየስን እዋንን መጠንቀቕታ ለበዳ ዘለዓዕል ብዝሒ መርመራታት ሓደ ሕማም።",  // draft – needs native review
  "settings.outbreak_verified_only": "ብDA ዝተረጋገጹ ጥራይ ቑጸር",  // draft – needs native review
  "settings.outbreak_verified_only.hint": "ክፉት እንተኾይኑ፦ DA ዘረጋገጾም መርመራታት ጥራይ ንመጠንቀቕታ ለበዳ ይቑጸሩ።",  // draft – needs native review
  "settings.diagnosis_history_days": "ታሪኽ መርመራ ስእሊ ንኣማኻሪ (መዓልትታት)",  // draft – needs native review
  "settings.diagnosis_history_days.hint": "እቲ ኣማኻሪ መርመራታት ስእሊ ሓረስታይ ክንደይ ንድሕሪት ከም ዝርኢ።",  // draft – needs native review
  "settings.max_alerts_per_week": "መጠንቀቕታታት ንሓደ ሓረስታይ ኣብ ሰሙን",  // draft – needs native review
  "settings.max_alerts_per_week.hint": "ነባሪ ሰሙናዊ ደረት፤ ተወሰኽቲ መጠንቀቕታታት ይሕዙ።",  // draft – needs native review
  "settings.strict_dose_policy": "ጽኑዕ ፖሊሲ መጠን",  // draft – needs native review
  "settings.strict_dose_policy.hint": "ክፉት እንተኾይኑ፦ ኩሉ መጠን ካብ ዝተረጋገጸ ሰደቓ መጠን ክመጽእ ኣለዎ። ዕጹው እንተኾይኑ፦ ልክዕ ኣሃዝ ኣብ ዝተጠቕሰ ጽሑፍ ሚኒስትሪ እንተሎ መጠን ማዳበርያን ዘርእን ክጥቀስ ይኽእል። መጠን ፀረ-ባልዕ ወትሩ ካብቲ ሰደቓ ጥራይ እዩ።",  // draft – needs native review
  "monitor.description": "እቲ ኣማኻሪ ብኸመይ ይጥቀመሉ ከም ዘሎ። ድምርታት ጥራይ፣ ውልቃዊ ሓበሬታ የለን።",  // draft – needs native review
  "monitor.days": "ዝሓለፋ {n} መዓልትታት",  // draft – needs native review
  "monitor.questions": "ሕቶታት",  // draft – needs native review
  "monitor.escalationRate": "ናብ ሰብ ዝተሰጋገሩ",  // draft – needs native review
  "monitor.diagnoses": "መርመራታት ስእሊ",  // draft – needs native review
  "monitor.agreement": "DA ምስ መርመራ ስእሊ ዝተሰማምዓሉ",  // draft – needs native review
  "monitor.resolveTime": "ማእከላይ ግዜ መልሲ",  // draft – needs native review
  "monitor.hours": "{n} ሰዓት",  // draft – needs native review
  "monitor.consentData": "ሓበሬታ ዝካፈሉ ሓረስቶት",  // draft – needs native review
  "monitor.ofFarmers": "ካብ {total} ሓረስቶት {n}",  // draft – needs native review
  "monitor.perDay": "ሕቶታትን መርመራታት ስእልን ብመዓልቲ",  // draft – needs native review
  "monitor.byLanguage": "ሕቶታት ብቋንቋ",  // draft – needs native review
  "monitor.confidence": "ርግጸኛነት መልሲ",  // draft – needs native review
  "monitor.flags": "ዝተለዓዓሉ መርመራታት ድሕንነት",  // draft – needs native review
  "monitor.feedback": "ርእይቶ ሓረስቶት",  // draft – needs native review
  "monitor.byDisease": "መርመራታት ስእሊ ብሕማም",  // draft – needs native review
  "monitor.outcomes": "ውጽኢታት ክትትል",  // draft – needs native review
  "monitor.escReasons": "ጉዳያት ናብ ሰብ ዝተሰጋገሩሉ ምኽንያት",  // draft – needs native review
  "monitor.alerts": "መጠንቀቕታታት",  // draft – needs native review
  "monitor.none": "ኣብዚ እዋን ሓበሬታ የለን።",  // draft – needs native review
  "monitor.uncertain": "ዘይርግጸኛ",  // draft – needs native review
  "audit.description": "ኣብ ምምሕዳር መን እንታይ ከም ዝቐየረ፣ መን ሓበሬታ ሓረስቶት ከም ዝኸፈተን። ትሕዝቶ ሕቶታት ፈጺሙ ኣይዕቀብን።",  // draft – needs native review
  "audit.filter": "ብተግባር ኣጻሪ",  // draft – needs native review
  "audit.when": "መዓስ",  // draft – needs native review
  "audit.who": "መን",  // draft – needs native review
  "audit.action": "ተግባር",  // draft – needs native review
  "audit.target": "መዝገብ",  // draft – needs native review
  "audit.result": "ውጽኢት",  // draft – needs native review
  "audit.read": "ሓበሬታ ሓረስታይ ተኸፊቱ",  // draft – needs native review
  "audit.loadMore": "ተወሳኺ ኣምጽእ",  // draft – needs native review
  "audit.none": "መዝገብ የለን።",  // draft – needs native review
  "audit.unknownActor": "ዘይኣተወ ተጠቃሚ",  // draft – needs native review

  // ── Area reports & government role ────────────────────────────────────────
  "role.government": "መንግስቲ (ንምንባብ ጥራይ)",  // draft – needs native review
  "role.government.desc": "ሰራሕተኛታት ወረዳ፣ ቤት ጽሕፈት ክልል፣ ATI ወይ ሚኒስትሪ ሕርሻ። ንከባቢኦም ዝተጠቓለሉ ጸብጻባትን ካርታታት ለበዳን ይርእዩ፤ ንነፍሲ ወከፍ ሓረስታይ ፈጺሞም ኣይርእዩን።",  // draft – needs native review
  "perm.reports_read": "ጸብጻባት ከባቢ ምርኣይ",  // draft – needs native review
  "perm.reports_read.desc": "ንከባቢኦም ዝተጠቓለሉ ኣሃዛት፦ ዝበጽሖም ሓረስቶት፣ መርመራታት ስእሊ ብሕማም፣ ለበዳታት፣ መጠንቀቕታታት። ንኣሽቱ ቁጽርታት ይሕብኡ።",  // draft – needs native review
  "nav.reports": "ጸብጻባት ከባቢ",  // draft – needs native review
  "reports.description": "ድምርታት ከባቢኹም፦ ዝበጽሖም ሓረስቶት፣ መርመራታት ስእሊ ብሕማም፣ ለበዳታትን መጠንቀቕታታትን። ነፍሲ ወከፍ ሓረስታይ ኣይርአን።",  // draft – needs native review
  "reports.scope": "ከባቢ፦ {area}",  // draft – needs native review
  "reports.country": "ብሙሉኣ ሃገር",  // draft – needs native review
  "reports.period": "ዝሓለፋ {n} መዓልትታት",  // draft – needs native review
  "reports.export": "CSV ኣውጽእ",  // draft – needs native review
  "reports.print": "ሕተም ወይ ከም PDF ዓቅብ",  // draft – needs native review
  "reports.farmers": "ዝተመዝገቡ ሓረስቶት",  // draft – needs native review
  "reports.reached": "ዝበጽሖም ሓረስቶት",  // draft – needs native review
  "reports.questions": "ሕቶታት",  // draft – needs native review
  "reports.photoChecks": "መርመራታት ስእሊ",  // draft – needs native review
  "reports.outbreakAlerts": "መጠንቀቕታታት ለበዳ",  // draft – needs native review
  "reports.escalations": "ናብ DA ዝተላእኩ ጉዳያት",  // draft – needs native review
  "reports.outcomes": "ክትትል፦ ተመሓይሹ / ከምቲ ዝነበሮ / ገዲዱ",  // draft – needs native review
  "reports.byDisease": "መርመራታት ስእሊ ብሕማም",  // draft – needs native review
  "reports.woredas": "ብወረዳ",  // draft – needs native review
  "reports.col.woreda": "ወረዳ",  // draft – needs native review
  "reports.col.zone": "ዞባ",  // draft – needs native review
  "reports.noData": "ኣብዚ ከባቢን እዋንን ንጥፈት የለን።",  // draft – needs native review
  "reports.map": "ቅድመ መጠንቀቕታ ለበዳ",  // draft – needs native review
  "reports.mapHint": "ኣብ ዝሓለፋ {n} መዓልትታት ዝተገብሩ ጸብጻባት ሕማም፣ ኣብ ማእከል ወረዳ ዝተቐመጡ (ኣብ ግራውቲ ኣይኮነን)። ዝዓበየት ነጥቢ ብዙሕ ጸብጻብ ማለት እዩ።",  // draft – needs native review
  "reports.demo": "ኣብነታዊ መዛግብቲ ኣእቱ",  // draft – needs native review
  "reports.demoBadge": "ኣብነታዊ መዛግብቲ የጠቓልል",  // draft – needs native review
  "reports.band.high": "10 ወይ ልዕሊኡ",  // draft – needs native review
  "reports.band.medium": "ካብ 5 ክሳብ 9",  // draft – needs native review
  "reports.band.low": "ትሕቲ 5",  // draft – needs native review
  "reports.noOutbreaks": "ኣብዚ እዋን ጸብጻብ ሕማም የለን።",  // draft – needs native review
  "reports.suppressedNote": "\"<5\" ማለት ካብ 1 ክሳብ 4 ማለት እዩ። ዝኾነ ሓረስታይ ከይፍለጥ ንኣሽቱ ቁጽርታት ይሕብኡ።",  // draft – needs native review
  "reports.latest": "ናይ መወዳእታ {date}",  // draft – needs native review

  // ── Input Trust ───────────────────────────────────────────────────────────
  "nav.verify": "ፍርያት ኣረጋግጽ",  // draft – needs native review
  "nav.supplier": "መእተዊ ኣቕራቢ",  // draft – needs native review
  "nav.orgs": "ትካላት",  // draft – needs native review
  "role.supplier": "ኣቕራቢ",  // draft – needs native review
  "role.supplier.desc": "ሰራሕተኛ ኣቕራቢ እታወታት። ፍርያታትን ጉጅለታት ኮድን ናይቲ ትካል የመሓድር፤ ኮዳቱ ኣበይ ከም ዝረጋገጹ'ውን ይርኢ።",  // draft – needs native review
  "perm.inputs_verify": "ኮድ ፍርያት ምርግጋጽ",  // draft – needs native review
  "perm.inputs_verify.desc": "ዘርኢ፣ ማዳበርያ ወይ ኬሚካል ዘለዎ ማዕሸግ ሓቀኛ ምዃኑ ምርግጋጽን ዝተጠርጠረ ናይ ሓሶት ፍርያት ምጽብጻብን።",  // draft – needs native review
  "perm.supplier_manage": "ናይ ገዛእ ርእሱ ትካል ኣቕራቢ ምምሕዳር",  // draft – needs native review
  "perm.supplier_manage.desc": "ፍርያታት ምዝርዛር፣ ጉጅለታት ኮድን ምልክታትን ምፍጣር፣ ጉጅለታት ምምላስን ጸብጻባት ምርግጋጽ ምርኣይን።",  // draft – needs native review
  "perm.orgs_manage": "ትካላት ምምሕዳር",  // draft – needs native review
  "perm.orgs_manage.desc": "ትካላት ኣቕራቢ ምፍጣር፣ ተጠቀምቶም ምውሳኽን ምእጋድን።",  // draft – needs native review
  "demo.message.trust": "ዝርዝር ፍርያት ካብ ማንዋል ስርናይ ሚኒስትሪ ሕርሻ እዩ። ቁጽሪ ምዝገባ እቲ ወግዓዊ መዝገብ EAA ምስ ተራኸበ ይመጽእ።",  // draft – needs native review
  "trust.description": "ኣብ ማዕሸግ ዘርኢ፣ ማዳበርያ ወይ ኬሚካል ዘሎ QR ኮድ ቃኒኹም ወይ ኮዱ ጽሒፍኩም፣ ሓቀኛ ምዃኑ ፍለጡ።",  // draft – needs native review
  "trust.codeLabel": "ኮድ ፍርያት",  // draft – needs native review
  "trust.codePlaceholder": "ንኣብነት AB3D-EF7H-JK9M",  // draft – needs native review
  "trust.check": "ኣረጋግጽ",  // draft – needs native review
  "trust.scan": "QR ኮድ ቃኒ",  // draft – needs native review
  "trust.scanStop": "ካሜራ ኣቁም",  // draft – needs native review
  "trust.scanUnsupported": "እዚ ብራውዘር QR ኮድ ክቃኒ ኣይክእልን። ኣብ ትሕቲ QR ዝተሓትመ ኮድ ጽሓፉ።",  // draft – needs native review
  "trust.genuine": "ሓቀኛ",  // draft – needs native review
  "trust.warning": "መጠንቀቕታ",  // draft – needs native review
  "trust.genuineText": "እዚ ኮድ ካብ ዝፍለጥ ኣቕራቢ ዝመጸ ዝተመዝገበ ፍርያት እዩ።",  // draft – needs native review
  "trust.reason.unknown_code": "ነዚ ኮድ ኣይንፈልጦን። እቲ ማዕሸግ ናይ ሓሶት ክኸውን ይኽእል። ኣይትጠቐሙሉ፤ ኣብ ታሕቲ ጸብጽቡ።",  // draft – needs native review
  "trust.reason.recalled": "እቲ ኣቕራቢ ነዚ ጉጅለ መሊስዎ ኣሎ። ኣይትጠቐሙሉ፤ ናብቲ ድኳን መልስዎ።",  // draft – needs native review
  "trust.reason.supplier_suspended": "እዚ ኣቕራቢ ተኣጊዱ ኣሎ። ነዚ ፍርያት ቅድሚ ምጥቃምኩም ሰራሕተኛ ልምዓትኩም ሕተቱ።",  // draft – needs native review
  "trust.reason.not_registered": "እዚ ፍርያት ኣብ ዝርዝር ዝተመዝገቡ ፍርያታት የለን። ኣይትጠቐሙሉ።",  // draft – needs native review
  "trust.reason.expired": "ግዜ ናይዚ ጉጅለ ሓሊፉ። ኣይትጠቐሙሉ።",  // draft – needs native review
  "trust.reason.possible_copy": "እዚ ኮድ ካብቲ ዝጽበ ንላዕሊ ብዙሕ ግዜ ወይ ኣብ ብዙሓት ቦታታት ተረጋጊጹ። ኣብ ናይ ሓሶት ማዕሸጋት ተቐዲሑ ክኸውን ይኽእል። ነቲ ማዕሸግ ብጥንቃቐ ርኣይዎ፤ ሰራሕተኛ ልምዓትኩም ሕተቱ።",  // draft – needs native review
  "trust.product": "ፍርያት",  // draft – needs native review
  "trust.ingredient": "ዋና ትሕዝቶ",  // draft – needs native review
  "trust.registration": "ቁጽሪ ምዝገባ",  // draft – needs native review
  "trust.supplier": "ኣቕራቢ",  // draft – needs native review
  "trust.batch": "ጉጅለ",  // draft – needs native review
  "trust.expires": "ዘብቅዓሉ",  // draft – needs native review
  "trust.batchNote": "ሓደ ኮድ ንምሉእ ጉጅለ ይሽፍን። ሓቀኛ ውጽኢት እቲ ኮድ ሓቀኛ ምዃኑ የርኢ፤ እዚ ማዕሸግ ፈጺሙ ከም ዘይተቐድሐ ግን ከረጋግጽ ኣይክእልን።",  // draft – needs native review
  "trust.reportTitle": "ዝተጠርጠረ ናይ ሓሶት ፍርያት ጸብጽብ",  // draft – needs native review
  "trust.reportHint": "ዝረኸብኩምዎ ንገሩና። ወረዳኹም ካብ መግለጺኹም ይውሰኽ፤ ስምኩም ንኣቕራቢ ኣይርአን።",  // draft – needs native review
  "trust.reportProduct": "ፍርያት (ኣብ ዝርዝር እንተሎ)",  // draft – needs native review
  "trust.reportProductText": "ኣብ ማዕሸግ ዘሎ ስም ፍርያት",  // draft – needs native review
  "trust.reportShop": "ዝገዛእኩምሉ ቦታ (ድኳን ወይ ዕዳጋ)",  // draft – needs native review
  "trust.reportNote": "እንታይ ጌጋ ይመስል?",  // draft – needs native review
  "trust.reportSend": "ጸብጻብ ስደድ",  // draft – needs native review
  "trust.reportSent": "የቐንየልና። ጸብጻብኩም ተላኢኹ።",  // draft – needs native review
  "trust.notListed": "ኣብ ዝርዝር የለን",  // draft – needs native review
  "supplier.description": "ፍርያታትኩም፣ ጉጅለታት ኮድኩምን ኮዳትኩም ኣበይ ከም ዝረጋገጹን።",  // draft – needs native review
  "supplier.chooseOrg": "ትካል",  // draft – needs native review
  "supplier.catalogue": "ፍርያታተይ",  // draft – needs native review
  "supplier.catalogueHint": "ካብ ዝርዝር ዝተመዝገቡ ፍርያታት ምረጹ። ኮድ ክትፈጥሩ እትኽእሉ ኣብዚ ንዝተዘርዘሩ ፍርያታት ጥራይ እዩ።",  // draft – needs native review
  "supplier.addProduct": "ፍርያት ወስኽ",  // draft – needs native review
  "supplier.remove": "ኣወግድ",  // draft – needs native review
  "supplier.noProducts": "ክሳብ ሕጂ ፍርያት የለን።",  // draft – needs native review
  "supplier.batches": "ጉጅለታት ኮድ",  // draft – needs native review
  "supplier.batchesHint": "ነፍሲ ወከፍ ጉጅለ ሓደ ኮድ ይረክብ። ነቲ ምልክት ኣብ ነፍሲ ወከፍ ማዕሸግ ናይቲ ጉጅለ ሕተሙ።",  // draft – needs native review
  "supplier.newBatch": "ሓድሽ ጉጅለ",  // draft – needs native review
  "supplier.batchNumber": "ቁጽሪ ጉጅለ",  // draft – needs native review
  "supplier.units": "ብዝሒ ማዕሸጋት",  // draft – needs native review
  "supplier.manufactured": "ዝተፈረየሉ ዕለት",  // draft – needs native review
  "supplier.expires": "ዘብቅዓሉ ዕለት",  // draft – needs native review
  "supplier.create": "ጉጅለ ፍጠር",  // draft – needs native review
  "supplier.label": "ምልክት ሕተም",  // draft – needs native review
  "supplier.recall": "መልስ",  // draft – needs native review
  "supplier.recallConfirm": "ጉጅለ {batch} ይመለስ? ድሕሪኡ ነፍሲ ወከፍ ምርግጋጽ ናይዚ ኮድ መጠንቀቕታ ምምላስ ከርኢ እዩ።",  // draft – needs native review
  "supplier.recalled": "ተመሊሱ",  // draft – needs native review
  "supplier.active": "ንጡፍ",  // draft – needs native review
  "supplier.checks": "ምርግጋጻት",  // draft – needs native review
  "supplier.warnings": "መጠንቀቕታታት",  // draft – needs native review
  "supplier.noBatches": "ክሳብ ሕጂ ጉጅለ የለን።",  // draft – needs native review
  "supplier.report": "ኮዳትኩም ኣበይ ከም ዝረጋገጹ",  // draft – needs native review
  "supplier.reportHint": "ዝሓለፋ {n} መዓልትታት። ስም ሓረስቶት ፈጺሙ ኣይርአን።",  // draft – needs native review
  "supplier.byReason": "ውጽኢታት",  // draft – needs native review
  "supplier.byWoreda": "ብወረዳ",  // draft – needs native review
  "supplier.fakes": "ዝተጸብጸቡ ናይ ሓሶት ተጠርጣሪ ፍርያታት",  // draft – needs native review
  "supplier.noFakes": "ጸብጻብ የለን።",  // draft – needs native review
  "orgs.description": "ትካላት ኣቕራቢን ተጠቀምቶምን። ተጠቃሚ ቅድሚ ምውሳኹ ተራ ኣቕራቢ ክህልዎ ኣለዎ።",  // draft – needs native review
  "orgs.new": "ሓድሽ ትካል",  // draft – needs native review
  "orgs.name": "ስም",  // draft – needs native review
  "orgs.note": "መዘኻኸሪ (ኣማራጺ)",  // draft – needs native review
  "orgs.create": "ፍጠር",  // draft – needs native review
  "orgs.members": "ተጠቀምቲ",  // draft – needs native review
  "orgs.addMember": "ተጠቃሚ ወስኽ",  // draft – needs native review
  "orgs.phone": "ቁጽሪ ተሌፎን ተጠቃሚ",  // draft – needs native review
  "orgs.owner": "ዋና",  // draft – needs native review
  "orgs.staff": "ሰራሕተኛ",  // draft – needs native review
  "orgs.suspend": "ኣግድ",  // draft – needs native review
  "orgs.activate": "ኣንጥፍ",  // draft – needs native review
  "orgs.suspended": "ተኣጊዱ",  // draft – needs native review
  "orgs.none": "ክሳብ ሕጂ ትካል የለን።",  // draft – needs native review
  "orgs.batchesCount": "{n} ጉጅለታት",  // draft – needs native review

  // ── Voice questions ───────────────────────────────────────────────────────
  "voice.record": "ሕቶኹም ብድምጺ ተዛረቡ",  // draft – needs native review
  "voice.stop": "ምቕዳሕ ኣቁም",  // draft – needs native review
  "voice.working": "ዘረባኹም ናብ ጽሑፍ ይቕየር ኣሎ…",  // draft – needs native review
  "voice.privacy": "ይቕዳሕ ኣሎ… ድምጽኹም ናብ ጽሑፍ ንምቕያር ጥራይ ናብ Google Gemini ይለኣኽ። ኣይዕቀብን።",  // draft – needs native review
  "voice.unsupported": "ሕቶ ብድምጺ ማይክሮፎን የድልዮ፤ እዚ ብራውዘር ዝፈቕዶ ብውሑስ (https) ርክብ ጥራይ እዩ። በጃኹም ሕቶኹም ጽሓፉ።",  // draft – needs native review
  "voice.check": "ነቲ ጽሑፍ ኣረጋግጹ፣ ድሕሪኡ ስደዱ።",  // draft – needs native review
  "voice.unverified": "ምልላይ ድምጺ ነዚ ቋንቋ ሓድሽ እዩ። ነቲ ጽሑፍ ብጥንቃቐ ኣረጋግጹ፣ ድሕሪኡ ስደዱ።",  // draft – needs native review

  // ── Delete my data ────────────────────────────────────────────────────────
  "nav.erasure": "ሕቶታት ምድምሳስ ሓበሬታ",  // draft – needs native review
  "seasons.noGuidance": "ነዚ ሰብል ክሳብ ሕጂ ካላንደር ሰብል ወይ ምኽሪ የለን። መምርሒታት ሚኒስትሪ ናብ መኽዘን ፍልጠት ምስ ኣተዉ ክውሰኽ እዩ።",  // draft – needs native review
  "erase.title": "ሓበሬታይ ደምስስ",  // draft – needs native review
  "erase.hint": "እቲ መድረኽ ብዛዕባኹም ዝሕዞ ኩሉ ክድምሰስ ክትሓቱ ትኽእሉ ኢኹም። ኣመሓዳሪ ቅድም ነቲ ሕቶ የረጋግጾ። ብዘይ ስም ዝኾኑ ቁጽርታት (ንኣብነት ክንደይ መርመራታት ስእሊ ሕማም ከም ዝረኸቡ) ይዕቀቡ።",  // draft – needs native review
  "erase.reason": "ምኽንያት (ኣማራጺ)",  // draft – needs native review
  "erase.request": "ሓበሬታይ ክድምሰስ ሕተት",  // draft – needs native review
  "erase.confirm": "ኣመሓዳሪ ምስ ኣጽደቐ ግራውትኹም፣ ሕቶታትኩም፣ መጠንቀቕታታትኩምን ስእልታትኩምን ክድምሰሱ፣ ሕሳብኩም'ውን ክዕጾ እዩ። እዚ ክምለስ ኣይክእልን።",  // draft – needs native review
  "erase.pending": "ምድምሳስ ተሓቲቱ",  // draft – needs native review
  "erase.since": "ካብ {date} ጀሚሩ ንኣመሓዳሪ ይጽበ ኣሎ።",  // draft – needs native review
  "erase.cancel": "ሕቶ ሰርዝ",  // draft – needs native review
  "erase.rejected": "እቲ ናይ መወዳእታ ሕቶኹም ኣይጸደቐን፦ {note}",  // draft – needs native review
  "erase.legalDraft": "ንድፊ ጽሑፍ፣ ሕጋዊ ገምጋም ይጽበ ኣሎ (ኣዋጅ ሓለዋ ውልቃዊ ሓበሬታ 1321/2024)።",  // draft – needs native review
  "erase.adminDescription": "ሓበሬታኦም ክድምሰስ ዝደልዩ ሰባት ሕቶታት። ምጽዳቕ ግራውቶም፣ ሕቶታቶም፣ መጠንቀቕታታቶምን ስእልታቶምን ይድምስስ፣ ሕሳቦም'ውን ብኡንብኡ ብዘይ ስም ይገብሮ።",  // draft – needs native review
  "erase.status.pending": "ይጽበ ኣሎ",  // draft – needs native review
  "erase.status.approved": "ጸዲቑ",  // draft – needs native review
  "erase.status.rejected": "ተነጺጉ",  // draft – needs native review
  "erase.status.cancelled": "ተሰሪዙ",  // draft – needs native review
  "erase.none": "ኣብዚ ሕቶ የለን።",  // draft – needs native review
  "erase.note": "መዘኻኸሪ (ንኣብነት ነቲ ሕቶ ብኸመይ ከም ዘረጋገጽኩምዎ)",  // draft – needs native review
  "erase.approve": "ኣጽድቕን ደምስስን",  // draft – needs native review
  "erase.reject": "ንጸግ",  // draft – needs native review
  "erase.approveConfirm": "ሓበሬታ {name} ሕጂ ይድምሰስ? እዚ ክምለስ ኣይክእልን።",  // draft – needs native review

  // ── Agronomist review ─────────────────────────────────────────────────────
  "nav.review": "ገምጋም ትሕዝቶ",  // draft – needs native review
  "role.agronomist": "ክኢላ ሕርሻ / ገምጋሚ ትሕዝቶ",  // draft – needs native review
  "role.agronomist.desc": "ገምጋሚ ትሕዝቶ። ብDA ዝተሰጋገሩ ሕቶታት ይምልስ፣ መኽዘን ፍልጠት፣ ፕሮቶኮላት፣ ካላንደር ሰብልን ሰደቓታት መጠንን ይሕሉ፣ ንዳግመ ስልጠና ስእልታት ይፈሊ፣ ትርጉማት የጽድቕ።",  // draft – needs native review
  "perm.content_review": "ትሕዝቶ ምኽሪ ምግምጋም",  // draft – needs native review
  "perm.content_review.desc": "ዝተሰጋገሩ ሕቶታት ምምላስ፣ ሰደቓታት ፕሮቶኮል / ካላንደር / መጠን ምእራም፣ ስእልታት ምፍላይ፣ ትርጉማት ምጽዳቕ።",  // draft – needs native review
  "review.description": "DA ክምልሶም ዘይከኣለ ሕቶታት፣ ሰደቓታት ትሕዝቶ ምኽሪ፣ ንዳግመ ስልጠና ምልክታት ስእሊን ምጽዳቕ ትርጉምን።",  // draft – needs native review
  "review.tab.queue": "ዝተሰጋገሩ ሕቶታት",  // draft – needs native review
  "review.tab.content": "ሰደቓታት ትሕዝቶ",  // draft – needs native review
  "review.tab.labels": "ምልክታት ስእሊ",  // draft – needs native review
  "review.tab.translations": "ትርጉማት",  // draft – needs native review
  "review.queueEmpty": "ዝተሰጋገረ ሕቶ የለን።",  // draft – needs native review
  "review.daNote": "መዘኻኸሪ DA",  // draft – needs native review
  "review.promote": "ነዚ መልሲ ናብ መኽዘን ፍልጠት'ውን ወስኽ",  // draft – needs native review
  "review.kbQuestion": "እቲ ሕቶ ብሓፈሻዊ ኣዘራርባ",  // draft – needs native review
  "review.kbQuestionHint": "ስማት፣ ቁጽርታት ተሌፎን ወይ ቦታታት ኣይትጽሓፉ። እቲ ኣማኻሪ ከም ብክኢላ ዝተገምገመ መልሲ ክጠቕሶ እዩ።",  // draft – needs native review
  "review.contentHint": "ሰደቓ ኣውርዱ፣ ኣብ ስፕሬድሺት ኣርምዎ፣ እንደገና ጽዓንዎ። ነፍሲ ወከፍ መስመር ይምርመር፤ ምንጪ ዘይብሎም መስመራት ከም ዘይተረጋገጹ ተመልኪቶም ይጸንሑ።",  // draft – needs native review
  "review.table.calendar": "ሕግታት ካላንደር ሰብል",  // draft – needs native review
  "review.table.protocols": "ፕሮቶኮላት ሕክምና",  // draft – needs native review
  "review.table.dosage": "ሕግታት መጠን",  // draft – needs native review
  "review.download": "CSV ኣውርድ",  // draft – needs native review
  "review.upload": "CSV ጽዓን",  // draft – needs native review
  "review.uploaded": "{n} መስመራት ተጻዒኖም ({p} ሕጂ'ውን ከም ዘይተረጋገጹ ተመልኪቶም)።",  // draft – needs native review
  "review.labelsHint": "መርመራ DA ካብቲ ናይ ሞዴል ዝተፈልየሉ መርመራታት ስእሊ። ቅኑዕ ምልክት ኣረጋግጹ፤ እቶም ምልክታት ነቲ ሞዴል ዳግማይ ንምስልጣን ይለኣኹ።",  // draft – needs native review
  "review.exportLabels": "ምልክታት ኣውጽእ",  // draft – needs native review
  "review.noCorrections": "ክሳብ ሕጂ ዝተኣረመ መርመራ ስእሊ የለን።",  // draft – needs native review
  "review.model": "ሞዴል",  // draft – needs native review
  "review.da": "DA",  // draft – needs native review
  "review.label": "ምልክት",  // draft – needs native review
  "review.saveLabel": "ምልክት ዓቅብ",  // draft – needs native review
  "review.labelled": "ተመልኪቱ",  // draft – needs native review
  "review.translationsHint": "ነፍሲ ወከፍ ትርጉም ኣጽድቑ ወይ ዝሓሸ ጽሑፍ ኣማኽሩ። ምኽርታት ንሰራሕቲ ሶፍትዌር ናብ ፋይላት ከእትውዎ ይለኣኹ።",  // draft – needs native review
  "review.exportReviews": "ገምጋማት ኣውጽእ",  // draft – needs native review
  "review.source": "ጽሑፋት",  // draft – needs native review
  "review.sourceUi": "ገጻት",  // draft – needs native review
  "review.sourceAdvisory": "መልእኽትታት ኣማኻሪ",  // draft – needs native review
  "review.search": "ድለ",  // draft – needs native review
  "review.onlyOpen": "ዘይተገምገሙ ጥራይ",  // draft – needs native review
  "review.count": "{n} ጽሑፋት",  // draft – needs native review
  "review.approved": "ጸዲቑ",  // draft – needs native review
  "review.changes": "ለውጢ ተማኺሩ",  // draft – needs native review
  "review.approve": "ኣጽድቕ",  // draft – needs native review
  "review.suggest": "ለውጢ ኣማኽር",  // draft – needs native review
  "review.saveSuggestion": "ምኽሪ ዓቅብ",  // draft – needs native review

  // ── Agro-dealer shops ─────────────────────────────────────────────────────
  "nav.dealer": "ድኳነይ",  // draft – needs native review
  "role.agro_dealer": "ነጋዳይ እታወታት ሕርሻ (ድኳን)",  // draft – needs native review
  "role.agro_dealer.desc": "ሰራሕተኛ ድኳን ቸርቻሪ እታወታት። ሓበሬታ ድኳንን ዘለዉ ፍርያታትን ይሕሉ፣ ኣብ ግዜ መሸጣ ኮዳት ፍርያት የረጋግጽ።",  // draft – needs native review
  "perm.dealer_manage": "ናይ ገዛእ ርእሱ ድኳን ምምሕዳር",  // draft – needs native review
  "perm.dealer_manage.desc": "ሓበሬታ ድኳንን ዘለዉ ፍርያታትን ምሕላው፣ ክሸይጥ ከሎ ኮዳት ፍርያት ምርግጋጽ።",  // draft – needs native review
  "dealer.description": "ቦታን ተሌፎንን ድኳንኩም፣ እትሸጥዎም ዝተመዝገቡ ፍርያታት፣ ቅድሚ መሸጣ ምርግጋጽ ኮድን።",  // draft – needs native review
  "dealer.notVerified": "ገና ኣይተረጋገጸን",  // draft – needs native review
  "dealer.badgeHint": "ኣመሓዳሪ ነቲ ድኳን ምስ ኣረጋገጸ ምልክት ዝተረጋገጸ ሸያጢ ይህብ። ንሓረስቶት ዝርኣዩ ዝተረጋገጹ ድኳናት ጥራይ እዮም።",  // draft – needs native review
  "dealer.phone": "ተሌፎን ድኳን",  // draft – needs native review
  "dealer.products": "ዝሸጦም ፍርያታት",  // draft – needs native review
  "dealer.productsHint": "ዝተመዝገቡ ፍርያታት ጥራይ። ምስ ወድአ \"ኣብ መኽዘን ኣሎ\" ዕጸውዎ፣ ሓረስቶት ናባኹም ከይለኣኹ።",  // draft – needs native review
  "dealer.inStock": "ኣብ መኽዘን ኣሎ",  // draft – needs native review
  "dealer.check": "ቅድሚ ምሻጥኩም ነቲ ማዕሸግ ኣረጋግጹ",  // draft – needs native review
  "dealer.checkHint": "ኣብቲ ማዕሸግ ዘሎ ኮድ ጽሓፉ ወይ ቃንዩ። እቲ ምርግጋጽ ንድኳንኩም ይምዝገብ።",  // draft – needs native review
  "shops.title": "ኣብ ጥቓኹም ዘለዉ ዝተረጋገጹ ድኳናት",  // draft – needs native review
  "shops.withProduct": "እዚ ፍርያት ዘለዎም ዝተረጋገጹ ድኳናት",  // draft – needs native review
  "shops.hint": "ምልክት ዝተረጋገጸ ሸያጢ ዘለዎም ድኳናት፣ ብቐረባ ዝተሰርዑ። ስርዓቱ ብርሕቀት ጥራይ እዩ፤ ዝኾነ ድኳን ቀዳማይ ንምዃን ኣይኸፍልን።",  // draft – needs native review
  "shops.none": "ክሳብ ሕጂ ዝተረጋገጸ ድኳን ኣይተረኽበን።",  // draft – needs native review
  "shops.badge": "ዝተረጋገጸ ሸያጢ",  // draft – needs native review
  "orgs.type": "ዓይነት",  // draft – needs native review
  "orgs.type.supplier": "ኣቕራቢ እታወታት",  // draft – needs native review
  "orgs.type.agro_dealer": "ድኳን እታወታት ሕርሻ",  // draft – needs native review
  "orgs.type.abc": "ናይ ሓረስቶት ትካል ንግዲ ሕርሻ (ABC)",  // draft – needs native review
  "orgs.type.commercial_farm": "ንግዳዊ ሕርሻ",  // draft – needs native review
  "orgs.type.ngo": "ዘይመንግስታዊ ትካል / ፕሮጀክት",  // draft – needs native review

  // ── Demand and supply outlook ─────────────────────────────────────────────
  "demand.title": "ጠለብ ብዞባ",  // draft – needs native review
  "demand.hint": "ዝሓለፋ 90 መዓልትታት፦ ነቶም ፍርያታትኩም ዘነጽርዎም ሕማማት ዝረኸቡ መርመራታት ስእሊ፣ ከምኡ'ውን ነቶም ዝምልከቱ ሰብልታት ዘፍርዩ ግራውቲ። እቲ ካርታ መጠንቀቕታታት ኮድ ንፍርያታትኩም (ናይ ሓሶት ክኾኑ ዝኽእሉ) እውን የርኢ፤ መግለጺኡ ርኣዩ።",  // draft – needs native review
  "demand.checks": "መርመራታት ስእሊ",  // draft – needs native review
  "demand.warnings": "መጠንቀቕታታት ኮድ",  // draft – needs native review
  "outlook.title": "ትንቢት ምእካብ ብዞባ",  // draft – needs native review
  "outlook.hint": "ካብቶም ሓረስቶት ዝምዝግብዎም ወቕትታት ሰብል፦ ክንደይ ግራውቲ ነቲ ሰብል ከም ዘፍርዩን መዓስ ክእክቡ ከም ዝጽበዩን። ዓቐን ፍርያት ኣይግመትን።",  // draft – needs native review
  "outlook.allCrops": "ኩሎም ሰብልታት",  // draft – needs native review
  "outlook.farms": "ግራውቲ",  // draft – needs native review
  "outlook.area": "ስፍሓት",  // draft – needs native review
  "outlook.harvest": "ዝጽበ ምእካብ",  // draft – needs native review
  "outlook.hidden": "ተሓቢኡ (ትሕቲ 5 ግራውቲ)",  // draft – needs native review
  "outlook.unknown": "ኣይፍለጥን",  // draft – needs native review
  "outlook.estimated": "ገለ ኣዋርሕ ካብ ካላንደር ሰብል ሚኒስትሪ ዝተገመቱ እዮም።",  // draft – needs native review
  "outlook.none": "ነዚ ሰብል ክሳብ ሕጂ ዝተመዝገበ ወቕቲ ሰብል የለን።",  // draft – needs native review

  // ── ABC and buy requests ──────────────────────────────────────────────────
  "nav.abc": "ናተይ ABC",  // draft – needs native review
  "role.abc_manager": "ኣካያዲ ስራሕ ABC",  // draft – needs native review
  "role.abc_manager.desc": "ኣካያዲ ስራሕ ናይ ሓረስቶት ትካል ንግዲ ሕርሻ (ABC)። ምስቶም ዝተቐበሉ ኣባላት ይሰርሕ፦ ወፈያታት፣ መደብ ሰብል፣ መልእኽትታትን ሕቶታት ዓደግትን።",  // draft – needs native review
  "perm.abc_manage": "ናይ ገዛእ ርእሱ ABC ምምሕዳር",  // draft – needs native review
  "perm.abc_manage.desc": "ሓረስቶት ምዕዳም፣ ወፈያታት ምምዝጋብ፣ እታወታትን ምእካብን ምምዳብ፣ ንኣባላት መልእኽቲ ምልኣኽ፣ ንዓደግቲ ምምላስ።",  // draft – needs native review
  "perm.trade_request": "ሕቶታት ዕድጊ ምልጣፍ",  // draft – needs native review
  "perm.trade_request.desc": "ንABCታት ሰብልን ዓቐንን ምሕታት፣ መልስታቶም ምንባብን።",  // draft – needs native review
  "abc.description": "ግራውትን ሰብልን ኣባላትኩም፣ ወፈያታቶም፣ መደብ እታወታትን ምእካብን፣ ንኣባላት መልእኽትታትን ሕቶታት ዓደግትን።",  // draft – needs native review
  "abc.report": "ጸብጻብ ንATI (CSV)",  // draft – needs native review
  "abc.members": "ኣባላት",  // draft – needs native review
  "abc.invited": "ምቕባል ዝጽበዩ",  // draft – needs native review
  "abc.area": "ሕጂ ዝለምዕ ስፍሓት",  // draft – needs native review
  "abc.contributions": "መዝገባት ወፈያ",  // draft – needs native review
  "abc.tab.members": "ኣባላት",  // draft – needs native review
  "abc.tab.contributions": "ወፈያታት",  // draft – needs native review
  "abc.tab.planning": "መደብ",  // draft – needs native review
  "abc.tab.messages": "መልእኽትታት",  // draft – needs native review
  "abc.tab.buyers": "ዓደግቲ",  // draft – needs native review
  "abc.membersHint": "ዝተመዝገቡ ሓረስቶት ብተሌፎን ዕደሙ። ግራውትን ሰብልን ናይቲ ሓረስታይ ንABC ዝርኣዩ ኣብ ኣፖም ምስ ተቐበሉ ጥራይ እዩ።",  // draft – needs native review
  "abc.invitePhone": "ቁጽሪ ተሌፎን ሓረስታይ",  // draft – needs native review
  "abc.invite": "ዕደም",  // draft – needs native review
  "abc.invitedOk": "ዕድመ ተላኢኹ። እቲ ሓረስታይ ኣብ መግለጺየ ይቕበሎ።",  // draft – needs native review
  "abc.noMembers": "ክሳብ ሕጂ ኣባል የለን።",  // draft – needs native review
  "abc.waiting": "ይጽበ ኣሎ",  // draft – needs native review
  "abc.contributionsNote": "ወፈያ ዋናታት ኣክሲዮን (መሬት፣ እንስሳ፣ ጉልበት)። ዋጋ፦ ንመምርሒ ግምት ሚኒስትሪ ይጽበ ኣሎ። ብABC ዝሕዝ መዝገብ እዩ፣ ሕጋዊ ሰነድ ኣይኮነን።",  // draft – needs native review
  "abc.kind.land": "መሬት",  // draft – needs native review
  "abc.kind.livestock": "እንስሳ",  // draft – needs native review
  "abc.kind.labour": "ጉልበት",  // draft – needs native review
  "abc.quantity": "ዓቐን",  // draft – needs native review
  "abc.unit": "መለክዒ",  // draft – needs native review
  "abc.add": "ወስኽ",  // draft – needs native review
  "abc.byStage": "ሰብልታት ኣባላት ብደረጃ",  // draft – needs native review
  "abc.upcoming": "ኣብ ዝመጽእ 3 ሰሙን ዝጅምሩ ደረጃታት",  // draft – needs native review
  "abc.upcomingHint": "እታወታትን ጉልበትን ኣቐዲምኩም መድቡ፦ ኣብ ቀረባ ናብ ነፍሲ ወከፍ ደረጃ ዝኣትዉ ግራውትን ስፍሓትን።",  // draft – needs native review
  "abc.quantitiesNote": "ዓቐን እታወታት ገና ኣይተሓስበን፤ ዝተረጋገጸ ዓቐን ሚኒስትሪ የድልዮ። ሰራሕተኛ ልምዓትኩም ሕተቱ።",  // draft – needs native review
  "abc.messagesHint": "ንኣባላትኩም {n} መልእኽቲ ስደዱ። መጠንቀቕታ ዝዓጸዉ ኣባላት ኣይቕበልዎን፤ ሰሙናዊ ደረት'ውን ይሰርሕ።",  // draft – needs native review
  "abc.send": "ንኣባላት ስደድ",  // draft – needs native review
  "abc.sent": "ን{n} ኣባላት ተላኢኹ ({skipped} ኣይተላእከን፦ መጠንቀቕታ ዕጹው ወይ ሰሙናዊ ደረት በጺሑ)።",  // draft – needs native review
  "abc.buyersHint": "ካብ ነጋዶ ንክልልኩም ዝመጹ ክፉታት ሕቶታት ዕድጊ። መልስኹም ምስ ስምን ተሌፎንን ABCኹም ናብቲ ነጋዳይ ይበጽሕ።",  // draft – needs native review
  "abc.noBuyers": "ክፉት ሕቶ ዕድጊ የለን።",  // draft – needs native review
  "abc.answered": "ተመሊሱ",  // draft – needs native review
  "abc.answerPlaceholder": "ቅናሽኩም (ዓቐን፣ መዓስ፣ ሓሳብ ዋጋ)",  // draft – needs native review
  "abcInv.title": "ናተይ ABC",  // draft – needs native review
  "abcInv.hint": "ዝዓደሙኹም ናይ ሓረስቶት ትካላት ንግዲ ሕርሻ። እንተ ተቐቢልኩም፣ እቲ ABC ግራውትኹምን ወቕትታት ሰብልኹምን ክርኢ ይኽእል።",  // draft – needs native review
  "abcInv.accept": "ተቐበል",  // draft – needs native review
  "abcInv.decline": "ንጸግ",  // draft – needs native review
  "abcInv.member": "ኣባል",  // draft – needs native review
  "abcInv.leave": "ውጻእ",  // draft – needs native review
  "buy.title": "ሕቶታት ዕድጊ ንABCታት",  // draft – needs native review
  "buy.hint": "ንናይ ሓረስቶት ትካላት ንግዲ ሕርሻ ክትዕድግዎ እትደልዩ ንገሩ። ABCታት ናይቲ ክልል ምስ ኣድራሻኦም ኣብዚ ይምልሱ።",  // draft – needs native review
  "buy.quantity": "ዓቐን (ኩንታል)",  // draft – needs native review
  "buy.anyRegion": "ዝኾነ ክልል",  // draft – needs native review
  "buy.neededBy": "ዘድልየሉ ዕለት",  // draft – needs native review
  "buy.post": "ሕቶ ለጥፍ",  // draft – needs native review
  "buy.note": "መዘኻኸሪ (ጽሬት፣ ቦታ ምርካብ…)",  // draft – needs native review
  "buy.none": "ክሳብ ሕጂ ዝኾነ ሕቶ ኣይለጠፍኩምን።",  // draft – needs native review
  "buy.open": "ክፉት",  // draft – needs native review
  "buy.closed": "ተዓጽዩ",  // draft – needs native review
  "buy.noAnswers": "ክሳብ ሕጂ መልሲ የለን።",  // draft – needs native review
  "abc.descField": "መግለጺ",  // draft – needs native review

  // ── Commercial farm ───────────────────────────────────────────────────────
  "nav.estate": "ሕርሻይ (ንግዳዊ)",  // draft – needs native review
  "role.farm_manager": "ኣካያዲ ስራሕ ንግዳዊ ሕርሻ",  // draft – needs native review
  "role.farm_manager.desc": "ኣካያዲ ስራሕ ወይ ክኢላ ሕርሻ ናይ ንግዳዊ ሕርሻ። ብሎካት ሕርሻ፣ መዝገባት ምቅናይን መደብ ምእካብን ይሕሉ።",  // draft – needs native review
  "perm.estate_manage": "ናይ ገዛእ ርእሱ ንግዳዊ ሕርሻ ምምሕዳር",  // draft – needs native review
  "perm.estate_manage.desc": "ብሎካት ምውሳኽ፣ ምቅናይ ምምዝጋብ፣ ኣብ ጥቓ ብሎካት ዘለዉ መጠንቀቕታታት ሕማም ምርኣይ፣ መደብ ምእካብ ምውጻእ።",  // draft – needs native review
  "estate.description": "ብሎካት ሕርሻኹም ምስ ደረጃ ሰብልን ዝጽበ ምእካብን፣ መዝገባት ምቅናይ፣ ካብ ምቅናይን ካብ ጸብጻባት ኣብ ጥቓ ነፍሲ ወከፍ ብሎክን ዝመጹ መጠንቀቕታታት ሕማም።",  // draft – needs native review
  "estate.addBlock": "ብሎክ ወስኽ",  // draft – needs native review
  "estate.blocks": "ብሎካት",  // draft – needs native review
  "estate.block": "ብሎክ",  // draft – needs native review
  "estate.area": "ብሰብል ዝተሸፈነ ስፍሓት",  // draft – needs native review
  "estate.alerts": "መጠንቀቕታታት ሕማም",  // draft – needs native review
  "estate.alertScouting": "ምቅናይ {disease} ረኺቡ ({severity})",  // draft – needs native review
  "estate.alertNearby": "{disease} ኣብ ጥቓ እዚ ብሎክ ኣብ {farms} ግራውቲ ተጸብጺቡ (እቲ ዝቐረበ {km} ኪ.ሜ)",  // draft – needs native review
  "estate.noBlocks": "ክሳብ ሕጂ ብሎክ የለን። ቀዳማይ ግራትኩም ወስኹ።",  // draft – needs native review
  "estate.lastScouting": "ናይ መወዳእታ ምቅናይ",  // draft – needs native review
  "estate.scout": "ምቅናይ መዝግብ",  // draft – needs native review
  "estate.estimated": "ካብ ካላንደር ሰብል ዝተገመተ",  // draft – needs native review
  "estate.team": "ጉጅለ ሕርሻ",  // draft – needs native review
  "estate.teamHint": "ሕሳባት ጉጅለ ብኣመሓዳሪ ይውሰኹ (ገጽ ትካላት)።",  // draft – needs native review
  "estate.statusLabel": "ኩነታት",  // draft – needs native review
  "estate.status.active": "ይዓቢ ኣሎ",  // draft – needs native review
  "estate.status.harvested": "ተኣኪቡ",  // draft – needs native review
  "estate.status.fallow": "ዕረፍቲ",  // draft – needs native review
  "estate.severity": "እንታይ ረኺብኩም?",  // draft – needs native review
  "estate.sev.none": "ዋላ ሓንቲ",  // draft – needs native review
  "estate.sev.low": "ትሑት",  // draft – needs native review
  "estate.sev.medium": "ማእከላይ",  // draft – needs native review
  "estate.sev.high": "ልዑል",  // draft – needs native review
  "estate.disease": "ሕማም",  // draft – needs native review
  "estate.incidence": "ዝተጠቕዑ ተኽልታት (%)",  // draft – needs native review
  "estate.note": "መዘኻኸሪ",  // draft – needs native review

  // ── Regulator ─────────────────────────────────────────────────────────────
  "nav.regulator": "ተቖጻጻሪ (EAA)",  // draft – needs native review
  "role.regulator": "ተቖጻጻሪ (EAA)",  // draft – needs native review
  "role.regulator.desc": "ሰራሕተኛ ተቖጻጻሪ (EAA)። ወግዓዊ ዝርዝር ዝተመዝገቡ ፍርያታት የእቱ፣ ጸብጻባት ናይ ሓሶት ፍርያትን ምሃብ ኮድን ብደረጃ ሃገር ይርኢ።",  // draft – needs native review
  "perm.registry_manage": "ዝተመዝገቡ ፍርያታት ምቁጽጻር",  // draft – needs native review
  "perm.registry_manage.desc": "ወግዓዊ ዝርዝር ፍርያታት ምእታው፣ ሃገራዊ ካርታ ናይ ሓሶት ፍርያትን ምሃብ ኮድ ኣቕረብትን ምርኣይ።",  // draft – needs native review
  "regulator.description": "እቲ መድረኽ ዝጥቀመሉ ዝርዝር ዝተመዝገቡ ፍርያታት፣ ምርግጋጽ ኮድ ዝወድቀሉ ወይ ናይ ሓሶት ዝጽብጸበሉ ቦታ፣ ነፍሲ ወከፍ ኣቕራቢ ክንደይ ኮዳት ከም ዝህብን።",  // draft – needs native review
  "regulator.tab.registry": "ዝተመዝገቡ ፍርያታት",  // draft – needs native review
  "regulator.tab.counterfeits": "ካርታ ናይ ሓሶት ፍርያት",  // draft – needs native review
  "regulator.tab.issuance": "ምሃብ ኮድ",  // draft – needs native review
  "regulator.registryHint": "ነቲ ወግዓዊ ዝርዝር ብCSV ኣእትዉ (ምስቲ ዝወርድ ሓደ ዓይነት ዓምድታት)። ፍርያታት ይውሰኹ ወይ ይሕደሱ፣ ፈጺሞም ኣይድምሰሱን፤ መስመራት ዝተረጋገጹ ዝበሃሉ እቲ ፋይል ምስ ዝገልጽ ጥራይ እዩ።",  // draft – needs native review
  "regulator.import": "ወግዓዊ ዝርዝር ኣእቱ",  // draft – needs native review
  "regulator.summary": "{total} ፍርያታት፦ {registered} ዝተመዝገቡ፣ {banned} ዝተኣገዱ፤ {placeholder} ክሳብ ሕጂ ምስ ወግዓዊ ዝርዝር ኣይተረጋገጹን።",  // draft – needs native review
  "regulator.status.registered": "ዝተመዝገበ",  // draft – needs native review
  "regulator.status.banned": "ዝተኣገደ",  // draft – needs native review
  "regulator.status.expired": "ግዜኡ ዝሓለፈ",  // draft – needs native review
  "regulator.notVerified": "ዘይተረጋገጸ",  // draft – needs native review
  "regulator.counterfeitsHint": "ዝሓለፋ {n} መዓልትታት፦ {warnings} ዝወደቑ ምርግጋጻት ኮድን {fakes} ጸብጻባት ናይ ሓሶት ተጠርጣሪን፣ ብወረዳ።",  // draft – needs native review
  "regulator.warningsLegend": "ዝወደቑ ምርግጋጻትን ጸብጻባት ሓሶትን",  // draft – needs native review
  "regulator.fakeReports": "ጸብጻባት ሓሶት",  // draft – needs native review
  "regulator.noCounterfeits": "ኣብዚ እዋን ዝወደቐ ምርግጋጽ ወይ ጸብጻብ ሓሶት የለን።",  // draft – needs native review
  "regulator.issuanceHint": "ብኣቕራቢ፦ ዝተዘርዘሩ ፍርያታት፣ ጉጅለታት ኮድ፣ ዝተሸፈኑ ማዕሸጋት፣ ምርግጋጻት፣ መጠንቀቕታታትን ምምላሳትን።",  // draft – needs native review

  // ── NGO projects ──────────────────────────────────────────────────────────
  "nav.ngo": "ፕሮጀክታት NGO",  // draft – needs native review
  "role.ngo_staff": "ሰራሕተኛ NGO / ፕሮጀክት",  // draft – needs native review
  "role.ngo_staff.desc": "ሰራሕተኛ NGO ወይ ፕሮጀክት ልምዓት። ኣብ ዝተመርጹ ወረዳታት ፕሮጀክታት የካይድ፦ ንሓረስቶት ናይቲ ቦታ መልእኽትታት ምኽርን ዝተጠቓለሉ ጸብጻባት ውጽኢትን።",  // draft – needs native review
  "perm.ngo_manage": "ፕሮጀክታት NGO ምክያድ",  // draft – needs native review
  "perm.ngo_manage.desc": "ፕሮጀክታት ምፍጣር፣ ወረዳታቶም ምምራጽ፣ ናብኡ መልእኽትታት ምኽሪ ምልኣኽን ዝተጠቓለለ ውጽኢት ምርኣይን።",  // draft – needs native review
  "ngo.description": "ፕሮጀክታትኩም፣ ዝሽፍንዎም ወረዳታት፣ ንሓረስቶት ናይቲ ቦታ መልእኽትታት ምኽሪ፣ ከምኡ'ውን ነፍሲ ወከፍ ፕሮጀክት ካብ ዝጀመረ ዘሎ ውጽኢት። ድምርታት ጥራይ ይርኣዩ፤ ነፍሲ ወከፍ ሓረስታይ ፈጺሙ ኣይርአን።",  // draft – needs native review
  "ngo.new": "ሓድሽ ፕሮጀክት",  // draft – needs native review
  "ngo.start": "ዕለት ምጅማር",  // draft – needs native review
  "ngo.none": "ክሳብ ሕጂ ፕሮጀክት የለን።",  // draft – needs native review
  "ngo.since": "ካብ {date}",  // draft – needs native review
  "ngo.areas": "ወረዳታት ፕሮጀክት",  // draft – needs native review
  "ngo.noAreas": "እዚ ፕሮጀክት ዝሽፍኖም ወረዳታት ወስኹ።",  // draft – needs native review
  "ngo.addArea": "ወረዳ ወስኽ",  // draft – needs native review
  "ngo.message": "ንሓረስቶት ኣብዞም ወረዳታት መልእኽቲ ምኽሪ",  // draft – needs native review
  "ngo.messageHint": "ዝቕበልዎ መጠንቀቕታ ዝፈቐዱ ሓረስቶት ጥራይ እዮም፤ ሰሙናዊ ደረት'ውን ይሰርሕ።",  // draft – needs native review
  "ngo.sent": "ካብ {total} ሓረስቶት ናይቲ ከባቢ ን{sent} ተላኢኹ።",  // draft – needs native review
  "ngo.impact": "ካብ ምጅማር ዘሎ ውጽኢት",  // draft – needs native review
  "ngo.improved": "ክትትል፦ ተመሓይሹ",  // draft – needs native review

  // ── Lenders (credit profile with consent) ─────────────────────────────────
  "nav.lender": "ሕቶታት ልቓሕ",  // draft – needs native review
  "role.lender": "ሰራሕተኛ ባንኪ / MFI",  // draft – needs native review
  "role.lender.desc": "ሰራሕተኛ ባንኪ ወይ ማይክሮፋይናንስ። ሓረስቶት ሓበሬታ ልቓሖም ከካፍሉ ይሓትት፤ ጸብጻብ ሓረስታይ ዝርኢ ሓረስታይ ኣብ መተግበሪ ምስ ኣጽደቐ ጥራይ እዩ።",  // draft – needs native review
  "perm.credit_request": "ሓበሬታ ልቓሕ ሓረስታይ ምሕታት",  // draft – needs native review
  "perm.credit_request.desc": "ሓረስታይ ሓበሬታ ልቓሑ ከካፍል ምሕታት፣ ፍቓዱ ክሳብ ዘሎ ድማ ጸብጻብ ምንባብ።",  // draft – needs native review
  "credit.description": "ሓረስታይ ሓበሬታ ልቓሑ ከካፍል ሕተቱ። ሓረስታይ ኣብ መተግበሪኡ ክሳብ ዘጽድቕ ዋላ ሓንቲ ኣይትርእዩን። ፍቓድ ን30 መዓልቲ ይጸንሕ፤ ሓረስታይ ኣብ ዝኾነ እዋን ከልዕሎ ይኽእል።",  // draft – needs native review
  "credit.new": "ሓድሽ ሕቶ",  // draft – needs native review
  "credit.newHint": "ቁጽሪ ስልኪ ሓረስታይን ዝሓትኩምሉ ምኽንያትን ኣእትዉ። ሓረስታይ ስምኩምን እዚ ምኽንያትን ይርኢ።",  // draft – needs native review
  "credit.phone": "ስልኪ ሓረስታይ",  // draft – needs native review
  "credit.purpose": "ምኽንያት (ንኣብነት፦ ንወቕቲ መኸር ልቓሕ እታወታት)",  // draft – needs native review
  "credit.send": "ሕቶ ስደድ",  // draft – needs native review
  "credit.sent": "ተላኢኹ። እዚ ቁጽሪ ናይ ዝተመዝገበ ሓረስታይ እንተኾይኑ ሕቶኹም ኣብ መተግበሪኡ ይርኢ።",  // draft – needs native review
  "credit.mine": "ሕቶታተይ",  // draft – needs native review
  "credit.none": "ክሳብ ሕጂ ሕቶ የለን።",  // draft – needs native review
  "credit.status.not_shared": "ኣይተኻፈለን",  // draft – needs native review
  "credit.status.pending": "ይጽበ ኣሎ",  // draft – needs native review
  "credit.status.declined": "ተነጺጉ",  // draft – needs native review
  "credit.status.approved": "ተኻፊሉ",  // draft – needs native review
  "credit.status.expired": "ተወዲኡ",  // draft – needs native review
  "credit.status.revoked": "ተላዒሉ",  // draft – needs native review
  "credit.open": "ጸብጻብ ክፈት",  // draft – needs native review
  "credit.hide": "ጸብጻብ ሕባእ",  // draft – needs native review
  "credit.privacy": "\"ኣይተኻፈለን\" ማለት ሓረስታይ ገና ኣይመለሰን፣ ኣበየ፣ ወይ ቁጽሪ ኣይተመዝገበን ክኸውን ይኽእል። ዝኸፈትኩምዎ ነፍሲ ወከፍ ጸብጻብ ኣብ መዝገብ ኦዲት ይምዝገብ።",  // draft – needs native review
  "credit.score": "ነጥቢ {score} / 100",  // draft – needs native review
  "credit.farms": "{count} ግራት፣ {area} ሄክታር። ዘራእቲ፦ {crops}",  // draft – needs native review
  "credit.validUntil": "ክሳብ {date} ተኻፊሉ",  // draft – needs native review
  "credit.method": "ካብ ናይ ሓረስታይ ናይ ገዛእ ርእሱ መዝገባት ኣብ መድረኽ ብሕጊ ዝተሓሰበ ነጥቢ (AI ኣይኮነን)። ውሳነ ልቓሕ ኣይኮነን።",  // draft – needs native review
  "creditInv.title": "ሕቶታት ሓበሬታ ልቓሕ",  // draft – needs native review
  "creditInv.hint": "እዞም ባንክታት ወይ ትካላት ማይክሮፋይናንስ ሓበሬታ ልቓሕኩም (ነጥቢ፣ ግራውትን ዘራእትን፣ ስምን ስልክን) ክርእዩ ሓቲቶም። እንተ ኣጽዲቕኩም ን30 መዓልቲ ክርእይዎ ይኽእሉ። ኣብ ዝኾነ እዋን ከተልዕሉ ትኽእሉ።",  // draft – needs native review
  "creditInv.approve": "ኣካፍል",  // draft – needs native review
  "creditInv.sharedUntil": "ክሳብ {date} ተኻፊሉ",  // draft – needs native review
  "creditInv.revoke": "ምክፋል ኣቋርጽ",  // draft – needs native review

  // ── Offline mode ──────────────────────────────────────────────────────────
  "offline.offline": "ካብ መስመር ወጻኢ ኢኹም።",  // draft – needs native review
  "offline.savedCopy": "ኣብዚ ስልኪ ዝተዓቀበ ናይ መወዳእታ ሓበሬታ ትርእዩ ኣለኹም።",  // draft – needs native review
  "offline.waiting": "{n} ክለኣኹ ይጽበዩ ኣለዉ። ክሳብ ዝለኣኹ ኣይትውጽኡ።",  // draft – needs native review
  "offline.sent": "{n} ተላኢኾም። መልስታት ኣብ ኣማኻሪ፣ ውጽኢት ስእሊ ድማ ኣብ ጥዕና ዘራእቲ ኣለዉ።",  // draft – needs native review
  "offline.notSent": "ኣይተላእከን፦ {message}",  // draft – needs native review
  "offline.dismiss": "ሕራይ",  // draft – needs native review
  "offline.queuedQuestion": "ርክብ የለን። ሕቶኹም ኣብዚ ስልኪ ተዓቂቡ ኣሎ፤ ርክብ ምስ ተመልሰ ክለኣኽ እዩ።",  // draft – needs native review
  "offline.queuedPhoto": "ርክብ የለን። ስእልኹም ኣብዚ ስልኪ ተዓቂቡ ኣሎ፤ ርክብ ምስ ተመልሰ ክምርመር እዩ። ውጽኢቱ ኣብ ታሕቲ ክርአ እዩ።",  // draft – needs native review
  "offline.savedChecks": "ኣብዚ ስልኪ ዘለዉ ናይ ቀረባ እዋን መርመራታት ስእሊ",  // draft – needs native review
  "offline.savedChecksHint": "ብዘይ ርክብ ምኽሪ ከተንብቡ ምእንቲ ኣብዚ ተዓቂቦም። ምስ ወጻእኩም ይድምሰሱ።",  // draft – needs native review
  "offline.noDisease": "መርመራ ስእሊ",  // draft – needs native review
  "offline.open": "ክፈት",  // draft – needs native review

  // ── Training photo dataset ────────────────────────────────────────────────
  "consent.training": "መርመራ ሕማም ንምምሕያሽ ስእልታት ዘራእተይ ይዕቀቡ",  // draft – needs native review
  "consent.trainingHint": "ስእልታትኩም ብዘይ ስምኩም፣ ስልክኹም ወይ ቦታኹም ይዕቀቡ፤ ንምስልጣን ሞዴል ሕማም ጥራይ ይውዕሉ። እዚ እንተ ኣጥፊእኩምዎ ስእልታትኩም ካብ ስብስብ ይድምሰሱ (ቅድሚ ሕጂ ብኣኣቶም ዝሰልጠነ ሞዴል ክቕየር ኣይክእልን)።",  // draft – needs native review
  "consent.kind.training": "ስእልታት ንስልጠና",  // draft – needs native review
  "signup.consentTraining": "መርመራ ሕማም ንምምሕያሽ ስእልታት ዘራእተይ ይዕቀቡ (ኣማራጺ)",  // draft – needs native review
  "da.consentTrainingAsk": "ሓረስታይ ስእልታት ዘራእቱ መርመራ ሕማም ንምምሕያሽ ክዕቀቡ ይሰማማዕ",  // draft – needs native review
  "photo.fromGallery": "ካብ ጋለሪ ምረጽ",  // draft – needs native review
  "review.tab.dataset": "ስብስብ ሓበሬታ ስልጠና",  // draft – needs native review
  "dataset.description": "ሞዴል ሕማም ደጊምካ ንምስልጣን ብፍቓድ ሓረስቶት ዝተዓቀቡ ስእልታት ዘራእቲ። ስም፣ ስልኪ ወይ ነጥቢ GPS የለን፤ ሜታዳታ ስእሊ ይእለ።",  // draft – needs native review
  "dataset.exportLabelled": "ዝተሰምዩ ኣውጽእ (ZIP)",  // draft – needs native review
  "dataset.exportAll": "ኩሉ ኣውጽእ (ZIP)",  // draft – needs native review
  "dataset.included": "ኣብ ስብስብ ዘለዉ ስእልታት",  // draft – needs native review
  "dataset.labelled": "ዝተሰምዩ",  // draft – needs native review
  "dataset.excluded": "ዝተገለሉ",  // draft – needs native review
  "dataset.farmers": "ዝተሰማምዑ ሓረስቶት",  // draft – needs native review
  "dataset.byModel": "ሞዴል ዝበሎ",  // draft – needs native review
  "dataset.bySource": "ዝተላዕለሉ",  // draft – needs native review
  "dataset.filter.all": "ኩሉ",  // draft – needs native review
  "dataset.filter.unlabelled": "ዘይተሰምዩ",  // draft – needs native review
  "dataset.filter.labelled": "ዝተሰምዩ",  // draft – needs native review
  "dataset.filter.excluded": "ዝተገለሉ",  // draft – needs native review
  "dataset.none": "ክሳብ ሕጂ ኣብዚ ስእሊ የለን።",  // draft – needs native review
  "dataset.noneHint": "ዝተሰማምዑ ሓረስቶት መርመራ ስእሊ ምስ ገበሩ ስእልታት ይመጹ።",  // draft – needs native review
  "dataset.labelHint": "ንስልጠና ዝውዕል ስያመ እንተ ኣቐሚጥኩም ናትኩም እዩ፤ እንተዘይኮይኑ ምርግጋጽ DA። መልሲ ሞዴል ግምት ጥራይ እዩ።",  // draft – needs native review
  "dataset.byAgronomist": "ኣግሮኖሚስት",  // draft – needs native review
  "dataset.byDa": "DA",  // draft – needs native review
  "dataset.model": "ሞዴል",  // draft – needs native review
  "dataset.reason": "ምኽንያት (ንኣብነት፦ ደብዛዝ)",  // draft – needs native review
  "dataset.exclude": "ኣግልል",  // draft – needs native review
  "dataset.include": "ደጊምካ ኣእቱ",  // draft – needs native review
  "dataset.pickLabel": "ቅኑዕ ስያመ ምረጹ",  // draft – needs native review
  "dataset.saveLabel": "ስያመ ዓቅብ",  // draft – needs native review

  // ── Daily tips ────────────────────────────────────────────────────────────
  "nav.tips": "ዕለታዊ ምኽርታት",  // draft – needs native review
  "tips.today": "ናይ ሎሚ ምኽሪ ሕርሻ",  // draft – needs native review
  "tips.from": "ናይ ቀረባ እዋን ምኽርታት፣ ካብ {date}",  // draft – needs native review
  "tips.all": "ኩሎም ምኽርታት",  // draft – needs native review
  "tips.description": "ካብ መምርሒታት ሚኒስትሪ ሕርሻ ዝተወስዱ ሓጸርቲ ምኽርታት ሕርሻ፤ ቅድሚ ምሕታሞም ብኣግሮኖሚስት ይረጋገጹ።",  // draft – needs native review
  "tips.none": "ክሳብ ሕጂ ዝተሓትመ ምኽሪ የለን።",  // draft – needs native review
  "tips.englishOnly": "ብእንግሊዝኛ ተራእዩ፦ ትርጉም ገና ኣይተዳለወን።",  // draft – needs native review
  "review.tab.tips": "ዕለታዊ ምኽርታት",  // draft – needs native review
  "tips.reviewHint": "ኩሉ ንግሆ እቲ ስርዓት ናይ ጽባሕ ምኽርታት ካብ መምርሒታት MoA (AI እንተዘየለ ካብ ካሌንደር ዘራእቲ) የዳሉ። ክሳብ እተጽድቑ ዋላ ሓንቲ ኣይሕተምን። ቅድሚ ምጽዳቕ ነፍሲ ወከፍ ቋንቋ ርኣዩ።",  // draft – needs native review
  "tips.drafted": "ን{date} {n} ሓድሽ ንድፊ።",  // draft – needs native review
  "tips.draftNow": "ሕጂ ምኽርታት ኣዳሉ",  // draft – needs native review
  "tips.write": "ምኽሪ ጽሓፍ",  // draft – needs native review
  "tips.status.draft": "ገምጋም ይጽበ",  // draft – needs native review
  "tips.status.approved": "ተሓቲሙ",  // draft – needs native review
  "tips.status.rejected": "ተነጺጉ",  // draft – needs native review
  "tips.noneHere": "ኣብዚ ዋላ ሓንቲ የለን።",  // draft – needs native review
  "tips.origin.ai": "ንድፊ AI",  // draft – needs native review
  "tips.origin.calendar": "ካሌንደር ዘራእቲ",  // draft – needs native review
  "tips.origin.expert": "ብክኢላ ዝተጻሕፈ",  // draft – needs native review
  "tips.national": "መላእ ሃገር",  // draft – needs native review
  "tips.missingLangs": "ዝጎደለ፦ {langs}። እዞም ኣንበብቲ ናይ እንግሊዝኛ ጽሑፍ ክርእዩ እዮም።",  // draft – needs native review
  "tips.approve": "ኣጽድቕን ሕተምን",  // draft – needs native review
  "tips.reject": "ንጸግ",  // draft – needs native review
  "tips.edit": "ኣመሓይሽ",  // draft – needs native review
  "tips.aud.all": "ኩሉ",  // draft – needs native review
  "tips.date": "ዕለት",  // draft – needs native review
  "tips.region": "ኮድ ክልል (ባዶ = መላእ ሃገር)",  // draft – needs native review
  "tips.audience": "መን ይርእዮ",  // draft – needs native review
  "tips.title": "ኣርእስቲ",  // draft – needs native review
  "tips.text": "ጽሑፍ",  // draft – needs native review
  "tips.editorHint": "መምርሒታት ዝብልዎ ጥራይ ጽሓፉ። ፍርያት ወይ መጠን ፀረ-ባልዕ ፈጺምኩም ኣይትጽሓፉ። ንድፊ AI ክተመሓይሹ ከለኹም ምልክታት [S1] ግደፉ። \"ዓቅብን ሕተምን\" ነቲ ምኽሪ ብኡንብኡ ንኹሉ የርኢ፤ \"ከም ንድፊ ዓቅብ\" ንገምጋም የቐምጦ።",  // draft – needs native review
  "tips.save": "ዓቅብ",  // draft – needs native review
  "tips.cancel": "ግደፍ",  // draft – needs native review

  // ── Sign-in demo accounts ─────────────────────────────────────────────────
  "signin.demoHint": "ናይ ምቕራብ ከባቢ ምስ ኣብነታዊ ሰባትን መዛግብትን። ንምእታው ሕሳብ ጠውቑ።",  // draft – needs native review
  "signin.demoPassword": "ቃል ምሕላፍ",  // draft – needs native review
  "signin.demo.pitchFarmer": "ሓረስታይ መርኣዪ፣ ደዋ ጨፋ",  // draft – needs native review
  "signin.demo.farmerCases": "ጉዳያት DA ዘለዎ ሓረስታይ",  // draft – needs native review
  "signin.demo.oromiaFarmer": "ኣብ ኦሮሚያ ዘሎ ሓረስታይ (ኣፋን ኦሮሞ)",  // draft – needs native review

  // ── Admin daily tips ──────────────────────────────────────────────────────
  "nav.adminTips": "ምኽርታት ሕተም",  // draft – needs native review
  "tips.adminDescription": "ምኽሪ ጽሓፉ ንሓረስቶት፣ ሰራሕተኛታት ልምዓትን ካልኦት ተጠቀምትን ሕተሙ፤ ወይ እቲ ስርዓት ኩሉ ንግሆ ካብ መምርሒታት MoA ዘዳልዎም ንድፍታት ኣጽድቑ።",  // draft – needs native review
  "tips.savePublish": "ዓቅብን ሕተምን",  // draft – needs native review
  "tips.saveDraft": "ከም ንድፊ ዓቅብ",  // draft – needs native review
  "tips.manage": "ምኽሪ ጽሓፍ ወይ ኣጽድቕ",  // draft – needs native review

  // ── AI engine choice (Gemini / DeepSeek) ──────────────────────────────────
  "aikeys.engine.title": "ሞተር ጽሑፋዊ መልስታት",  // draft – needs native review
  "aikeys.engine.description": "ኣየናይ AI መልስታት ኣማኻሪ፣ ዕለታዊ ምኽርታትን ሓጸርቲ መብርሂታትን ከም ዝጽሕፍ ምረጹ። ሕግታት ኣይቅየሩን፦ መልስታት ካብ መምርሒታት ጥራይ፣ ምስ ምንጪ፣ ውልቃዊ ሓበሬታ ኣይለኣኽን።",  // draft – needs native review
  "aikeys.engine.geminiHint": "ንድምጽን ንድለያ መኽዘን ፍልጠትን'ውን ይውዕል። ናጻ ደረጃ ኣለዎ።",  // draft – needs native review
  "aikeys.engine.deepseekHint": "ጽሑፍ ጥራይ፤ ብቕድመ ክፍሊት ሕሳብ ብኣጠቓቕማ ይኽፈል። ሓበሬታ ኣብ ቻይና ዘለዉ ኣገልገልቲ DeepSeek ይስራሕ፤ ነቲ ንGemini ዝለኣኽ ተመሳሳሊ ስም-ኣልቦ ጽሑፍ ይቕበል።",  // draft – needs native review
  "aikeys.engine.inUse": "ኣብ ጥቕሚ",  // draft – needs native review
  "aikeys.engine.use": "እዚ ተጠቐም",  // draft – needs native review
  "aikeys.engine.keys": "{n} ዝሰርሕ መፍትሕ",  // draft – needs native review
  "aikeys.engine.fallbackOn": "እቲ ዝተመርጸ ሞተር እንተዘይሰሪሑ፣ እቲ ካልእ ዝሰርሕ መፍትሕ እንተሃልይዎ ይምልስ (ኣብ ገጽ ቅጥዒታት ምኽሪ ይቕየር)።",  // draft – needs native review
  "aikeys.engine.fallbackOff": "ናብ ካልእ ሞተር ምቕያር ጠፊኡ ኣሎ (ገጽ ቅጥዒታት ምኽሪ)።",  // draft – needs native review
  "aikeys.engine.geminiOnly": "ድምጽን ድለያ መኽዘን ፍልጠትን ኩሉ ግዜ Gemini ይጥቀሙ፤ ስለዚ እንተወሓደ ሓደ መፍትሕ Gemini ሓልዉ።",  // draft – needs native review
  "aikeys.engine.saved": "ሕጂ {name} መልስታት ይጽሕፍ።",  // draft – needs native review
  "aikeys.engine.noKey": "{name} ተመሪጹ ግን ክሳብ ሕጂ ዝሰርሕ መፍትሕ የብሉን። መፍትሕ ወስኹ፤ ክሳብ ሽዑ ምቕያር እንተተወሊዑ እቲ ካልእ ሞተር ይምልስ።",  // draft – needs native review
  "aikeys.providerKeys": "መፍትሕታት {name}",  // draft – needs native review
  "aikeys.provider": "ኣቕራቢ",  // draft – needs native review
  "aikeys.getGemini": "ኣብ aistudio.google.com/apikey መፍትሕ ፍጠሩ። ካብ ዝተፈላለዩ ፕሮጀክታት Google ዝመጹ መፍትሕታት ዝተፈላለየ ደረት ኣለዎም።",  // draft – needs native review
  "aikeys.getDeepseek": "ኣብ platform.deepseek.com (API keys) መፍትሕ ፍጠሩን ኣብኡ ሕሳብ መልኡን። ሕሳብ ዘይብሉ መፍትሕ ይሕለፍ።",  // draft – needs native review
  "settings.llm_fallback": "እቲ ዝተመርጸ ሞተር AI እንተዘይሰሪሑ እቲ ካልእ ተጠቐም",  // draft – needs native review
  "settings.llm_fallback.hint": "ተወሊዑ፦ እቲ ዝተመርጸ ሞተር (Gemini ወይ DeepSeek) መፍትሕ ወይ ሕሳብ እንተዘይብሉ ወይ እንተተቛሪጹ፣ እቲ ካልእ ዝሰርሕ መፍትሕ እንተሃልይዎ ይምልስ። ሞተር ኣብ ገጽ መፍትሕታት AI API ይምረጽ።",  // draft – needs native review
  "settings.daily_tips_auto": "ኩሉ ንግሆ ዕለታዊ ምኽርታት ኣዳሉ",  // draft – needs native review
  "settings.daily_tips_auto.hint": "ተወሊዑ፦ ኩሉ ንግሆ እቲ ስርዓት ናይ ጽባሕ ምኽርታት ንገምጋም የዳሉ። ኣግሮኖሚስት ወይ ኣመሓዳሪ ክሳብ ዘጽድቕ ዋላ ሓንቲ ኣይሕተምን።",  // draft – needs native review
  "settings.daily_tips_per_day": "ብመዓልቲ ዝዳለዉ ምኽርታት",  // draft – needs native review
  "settings.daily_tips_per_day.hint": "ነፍሲ ወከፍ ንድፊ AI ሓደ ሕቶ AI ይጥቀም።",  // draft – needs native review

  // ── DeepSeek key list ─────────────────────────────────────────────────────
  "aikeys.noneHintDeepseek": "ሓደ ክሳብ እትውስኹ፣ DeepSeek ክጥቀመሉ ዝኽእል ኣብ ፋይል .env ናይ ኣገልጋሊ ዘሎ DEEPSEEK_API_KEY ጥራይ እዩ፣ እንተተቐሚጡ።",  // draft – needs native review

  // ── Sidebar groups ────────────────────────────────────────────────────────
  "nav.group.farming": "ሕርሻ",  // draft – needs native review
  "nav.group.extension": "ስራሕ ኤክስቴንሽን",  // draft – needs native review
  "nav.group.partners": "መእተዊ መሻርኽቲ",  // draft – needs native review
  "nav.group.contentAi": "ትሕዝቶን AI",  // draft – needs native review
  "nav.group.system": "ስርዓት",  // draft – needs native review

  // ── Livestock prices ──────────────────────────────────────────────────────
  "nav.livestock": "ዋጋ እንስሳ",  // draft – needs native review
  "lv.description": "ብዕዳጋታት እንስሳ NMIS ዝተጸብጸበ ዋጋ ንሓደ እንስሳ፣ ምስ ግምት 4 ሰሙንን ክንደይ ርግጸኛ ምዃኑን።",  // draft – needs native review
  "lv.animal": "እንስሳ",  // draft – needs native review
  "lv.animal.ox": "ብዕራይ",  // draft – needs native review
  "lv.animal.cow": "ላም",  // draft – needs native review
  "lv.animal.bull": "ኮርማ",  // draft – needs native review
  "lv.animal.heifer": "ጊደር",  // draft – needs native review
  "lv.animal.calf": "ምራኽ",  // draft – needs native review
  "lv.animal.sheep": "በጊዕ",  // draft – needs native review
  "lv.animal.goat": "ጤል",  // draft – needs native review
  "lv.animal.camel": "ገመል",  // draft – needs native review
  "lv.animal.chicken": "ደርሆ",  // draft – needs native review
  "lv.sourceLine": "ምንጪ፦ ሓበሬታ ዕዳጋ እንስሳ NMIS፣ ካብ {start} ክሳብ {end}።",  // draft – needs native review
  "lv.stat.reports": "ጸብጻባት ዋጋ",  // draft – needs native review
  "lv.stat.markets": "ዕዳጋታት",  // draft – needs native review
  "lv.stat.period": "እዋን ሓበሬታ",  // draft – needs native review
  "lv.stat.days": "{n} መዓልታት",  // draft – needs native review
  "lv.empty.title": "ገና ዋጋ እንስሳ ኣይተጻዕነን",  // draft – needs native review
  "lv.empty.description": "ጸብጻባት ዕዳጋ እንስሳ NMIS ምስ ኣተዉ ዋጋታት ኣብዚ ይርኣዩ።",  // draft – needs native review
  "lv.noSeries": "ነዚ ምርጫ ጸብጻብ የለን።",  // draft – needs native review
  "lv.outlook.title": "ግምት 4 ሰሙን",  // draft – needs native review
  "lv.outlook.country": "ብምሉእ ሃገር፣ ኩሎም ደረጃታት ብሓባር",  // draft – needs native review
  "lv.outlook.region": "{region}፣ ኩሎም ደረጃታት ብሓባር",  // draft – needs native review
  "lv.outlook.countryFallback": "ኣብ {region} ጸብጻባት ውሑዳት እዮም፤ ግምት ምሉእ ሃገር",  // draft – needs native review
  "lv.outlook.up": "ዋጋ ብ{pct}% ኣቢሉ ክውስኽ ይኽእል",  // draft – needs native review
  "lv.outlook.down": "ዋጋ ብ{pct}% ኣቢሉ ክንኪ ይኽእል",  // draft – needs native review
  "lv.outlook.flat": "ዋጋ ብዙሕ ኣይቅየርን",  // draft – needs native review
  "lv.outlook.range": "(ምናልባት ካብ {low}% ክሳብ {high}%)",  // draft – needs native review
  "lv.outlook.none": "ገና ግምት የለን፤ ኣንፈት ንምዕቃን ሓበሬታ እኹል ኣይኮነን።",  // draft – needs native review
  "lv.outlook.why": "ስለምንታይ እዚ ደረጃ እምነት",  // draft – needs native review
  "lv.outlook.note": "ነፍሲ ወከፍ ደረጃ ኣብ ነፍሲ ወከፍ ዕዳጋ ናይ ገዛእ ርእሱ ደረጃ ዋጋ ኣለዎ፤ እቲ ሞዴል ነቲ ሓባራዊ ኣንፈት ይዕቅን። ግምት መብጽዓ ኣይኮነን፤ ቅድሚ ምሻጥኩም ኣብ ዕዳጋ ኣረጋግጹ።",  // draft – needs native review
  "lv.conf.high": "ልዑል እምነት",  // draft – needs native review
  "lv.conf.medium": "ማእከላይ እምነት",  // draft – needs native review
  "lv.conf.low": "ትሑት እምነት",  // draft – needs native review
  "lv.reason.period": "ካብ {start} ክሳብ {end} ካብ {markets} ዕዳጋ(ታት) ዝተረኽቡ {reports} ጸብጻባት ዋጋ ዝተመርኮሰ።",  // draft – needs native review
  "lv.reason.no_season": "ሓበሬታ ካብ ሓደ ዓመት ስለ ዝወሓደ ናይ ወቕቲ ለውጥታት (በዓላት፣ ሓጋይ) ኣብቲ ሞዴል የለዉን።",  // draft – needs native review
  "lv.reason.few_reports": "{reports} ጸብጻባት ጥራይ፤ ሓንቲ ዘይልሙድ መዓልቲ ዕዳጋ ውጽኢት ክትቅይር ትኽእል።",  // draft – needs native review
  "lv.reason.short_period": "ናይ {days} መዓልታት ሓበሬታ ጥራይ፤ ኣንፈት ካብ ግዝያዊ ለውጢ ንምፍላይ ኣዝዩ ሓጺር እዩ።",  // draft – needs native review
  "lv.reason.stale": "እቲ ናይ መወዳእታ ጸብጻብ ቅድሚ {days} መዓልታት እዩ።",  // draft – needs native review
  "lv.reason.checked": "ኣብ ዘይረኣዮም ናይ ቀረባ ጸብጻባት ተፈቲኑ፦ ብማእከላይ ብ{pct}% ተጋጊዩ ('ለውጢ የለን' ምግማት ብ{naive}%)።",  // draft – needs native review
  "lv.reason.no_trend": "ኣብ ናይ ቀረባ ጸብጻባት እቲ ኣንፈት ({pct}%) 'ለውጢ የለን' ካብ ዝብል ({naive}%) ስለ ዘይበለጸ ግምት 'ብዙሕ ኣይቅየርን' እዩ።",  // draft – needs native review
  "lv.reason.not_checked": "ነቲ ሞዴል ብዘይረኣዮ ሓበሬታ ንምፍታን ናይ ቀረባ ጸብጻባት ኣዝዮም ውሑዳት እዮም።",  // draft – needs native review
  "lv.reason.too_few": "ኣንፈት ንምርኣይ ኣብ ሓደ ዕዳጋ ናይ ተመሳሳሊ ደረጃ ተደጋጋሚ ጸብጻባት እኹላት ኣይኮኑን።",  // draft – needs native review
  "lv.reason.no_data": "ነዚ እንስሳ ዝተጻዕነ ጸብጻብ የለን።",  // draft – needs native review
  "lv.chart.title": "ማእከላይ ዋጋ ንሓደ እንስሳ",  // draft – needs native review
  "lv.chart.description": "ማእከል ዝተሓተን ዝለዓለን ዋጋ፤ ብቐረባ ዝተጸብጸቡ {n} ደረጃታት።",  // draft – needs native review
  "lv.table.title": "ናይ ቀረባ ዋጋታት",  // draft – needs native review
  "lv.table.description": "ንሓደ እንስሳ፣ ካብ ዝተሓተ ክሳብ ዝለዓለ ዝተጸብጸበ ዋጋ። ግምት፦ ድሕሪ ናይ መወዳእታ ጸብጻብ 4 ሰሙን ዝጽበ ክሊ።",  // draft – needs native review
  "lv.table.market": "ዕዳጋ",  // draft – needs native review
  "lv.table.grade": "ደረጃ",  // draft – needs native review
  "lv.table.latest": "ናይ ቀረባ ዋጋ",  // draft – needs native review
  "lv.table.date": "ዝተጸብጸበሉ",  // draft – needs native review
  "lv.table.change": "ካብ ዝሓለፈ",  // draft – needs native review
  "lv.table.outlook": "ኣብ 4 ሰሙን",  // draft – needs native review
  "lv.import.title": "ዋጋ እንስሳ ኣእቱ",  // draft – needs native review
  "lv.import.description": "CSV ጸብጻባት ዋጋ እንስሳ NMIS ጸዓኑ (ንዓምድታት ቅጥዒ ኣውርዱ)። ዝተጻዕኑ ጸብጻባት ይሕደሱ፣ ግምት እውን ከም ብሓድሽ ይሰልጥን።",  // draft – needs native review
  "lv.import.template": "ቅጥዒ ኣውርድ",  // draft – needs native review
  "lv.import.upload": "CSV ጽዓን",  // draft – needs native review
  "lv.import.retrain": "ግምት ከም ብሓድሽ ኣሰልጥን",  // draft – needs native review
  "lv.import.result": "{added} ጸብጻባት ተወሲኾም፣ {updated} ተሓዲሶም፣ {rejected} ተነጺጎም፤ {forecasts} ግምታት ሰልጢኖም።",  // draft – needs native review
  "lv.import.trained": "{trained} ሞዴላት ከም ብሓድሽ ሰልጢኖም፤ {forecasts} ንግምት እኹል ሓበሬታ ኣለዎም።",  // draft – needs native review

  // ── Treatment value chain: dose, shops, pack check ───────────────────────
  "photo.p.forYourPlot": "ንግራትኩም",  // draft – needs native review
  "photo.p.rateSource": "መጠን፦ {source}",  // draft – needs native review
  "photo.p.cited": "መጠን ማንዋል MoA",  // draft – needs native review
  "photo.p.followLabel": "ኣብቲ ማሸጊያ ዘሎ ምልክት ናይ መወዳእታ እዩ።",  // draft – needs native review
  "photo.shop.verified": "ዝተረጋገጸ ሸያጢ",  // draft – needs native review
  "photo.shop.samplePrice": "ናይ ኣብነት ዋጋ",  // draft – needs native review
  "photo.shop.askPrice": "ዋጋ ንድኳን ሕተቱ",  // draft – needs native review
  "photo.shop.call": "ደውሉ",  // draft – needs native review
  "photo.shop.none": "ነዚኦም ፍርያት ዝሓዘ ድኳን ኣብቲ ስርዓት ገና የለን። ንሰራሕተኛ ልምዓት ወይ ማሕበርኩም ሕተቱ።",  // draft – needs native review
  "photo.checkPack": "ቅድሚ ምርጫትኩም ነቲ ማሸጊያ ኣረጋግጹ",  // draft – needs native review
  "photo.checkPackHint": "ኣብቲ ማሸጊያ ዘሎ QR ኮድ ስካን ግበሩ ወይ ኮድ ጽሓፉ፤ እቲ ኣፕ ሓቀኛ ምዃኑን ነዚ ሕማም ቅኑዕ ፍርያት ምዃኑን ይነግረኩም።",  // draft – needs native review
  "verify.plan.match": "እዚ ኣብ ናይ {disease} መደብ ሕክምናኹም ካብ ዘለዉ ፍርያት ሓደ እዩ።",  // draft – needs native review
  "verify.plan.matchButWarning": "እዚ ፍርያት ኣብ ናይ {disease} መደብ ሕክምናኹም ኣሎ፣ ግን እዚ ማሸጊያ ነቲ ምርግጋጽ ኣይሓለፈን፤ ኣይትጠቐሙሉ። ካልእ ማሸጊያ ገዚእኩም እንደገና ኣረጋግጹ።",  // draft – needs native review
  "verify.plan.noMatch": "እዚ ፍርያት ኣብ ናይ {disease} መደብ ሕክምናኹም የለን። ኣብቲ መደብ ዘለዉ ፍርያት፦ {list}። ቅድሚ ምጥቃምኩም ንሰራሕተኛ ልምዓት ሕተቱ።",  // draft – needs native review
  "verify.plan.for": "ንናይ ስእሊ ምርመራኹም ማሸጊያ ተረጋግጹ ኣለኹም፤ እቲ ውጽኢት ኣብ መደብ ሕክምናኹም ምህላዉ እውን ይነግር።",  // draft – needs native review
  "dealer.price": "ዋጋ ንሓደ ማሸጊያ (ብር)",  // draft – needs native review
  "dealer.pack": "ዓቐን ማሸጊያ",  // draft – needs native review
  "dealer.savePrice": "ዋጋ ዓቅብ",  // draft – needs native review
  "dealer.sampleNote": "ናይ ኣብነት ዋጋ (ንምርኢት)፦ ንምትካእ ናይ ገዛእ ርእስኹም ዋጋ ኣእትዉ።",  // draft – needs native review
  "dealer.priceHint": "እቲ ኣፕ ነቲ ፍርያት ክመኽር ከሎ ሓረስቶት ነዚ ዋጋ ምስ ዕለቱ ይርእዩ።",  // draft – needs native review

  // ── Map ─────────────────────────────────────────────────────────────────────
  "nav.map": "ካርታ",  // draft – needs native review
  "map.description": "ቦታታት ሕማም፣ ዋጋታት ዕዳጋ፣ ድኳናት እታወታትን ግራውትን ኣብ ሓደ ካርታ፣ ምስ ወግዓዊ ዶባት ክልል፣ ዞባን ወረዳን።",  // draft – needs native review
  "map.layers": "ደረጃታት",  // draft – needs native review
  "map.layer.disease": "ቦታታት ሕማም",  // draft – needs native review
  "map.layer.markets": "ዕዳጋታት ሰብልን ዋጋታትን",  // draft – needs native review
  "map.layer.shops": "ድኳናት እታወታት",  // draft – needs native review
  "map.layer.farms": "ግራውቲ",  // draft – needs native review
  "map.crop": "ንዋጋ ዝርአ ሰብል",  // draft – needs native review
  "map.period": "እዋን ሕማም",  // draft – needs native review
  "map.lastDays": "ዝሓለፉ {n} መዓልታት",  // draft – needs native review
  "map.legend": "መግለጺ",  // draft – needs native review
  "map.scope": "ዝርአ፦ {area}",  // draft – needs native review
  "map.kebele": "ቀበሌ፦ {kebele}",  // draft – needs native review
  "map.approxWoreda": "ኣብ ማእከል ወረዳ ይርአ (ግምታዊ)።",  // draft – needs native review
  "map.small": "ካብ 5 ዝወሓዱ ቁጽርታት <5 ተባሂሎም ይርኣዩ።",  // draft – needs native review
  "map.farms.mine": "ግራተይ",  // draft – needs native review
  "map.farms.visit": "ምብጻሕ፦",  // draft – needs native review
  "map.farms.count": "{farmers} ሓረስቶት · {farms} ግራውቲ",  // draft – needs native review
  "map.farms.hectares": "{ha} ሄክታር ተመዝጊቡ",  // draft – needs native review
  "map.farms.legendCounts": "ግራውቲ፦ ብወረዳ ዝተመዝገቡ ሓረስቶት (ሓደ ሓረስታይ በይኑ ኣይርአን)።",  // draft – needs native review
  "map.farms.legendDa": "ምሳኹም ዝሰርሑ ሓረስቶት (ብፍቓዶም)። ቀይሕ፦ ቅድም በጽሑ፤ ብርቱኳናዊ፦ ምብጻሕ የድልዮ።",  // draft – needs native review
  "map.farms.legendOwn": "ግራትኩም (ሊላ)።",  // draft – needs native review
  "map.markets.noPrice": "ኣብዚ ዕዳጋ ናይ ቀረባ እዋን ዋጋ {crop} የለን።",  // draft – needs native review
  "map.markets.approx": "ቦታ ግምታዊ እዩ፤ ኣብ ማእከል ክልል ይርአ።",  // draft – needs native review
  "map.markets.legend": "ናይ ቀረባ እዋን ዋጋ ቸርቻሪ NMIS",  // draft – needs native review
  "map.shops.counterfeit": "{warnings} መጠንቀቕታ ኮድ · {fakes} ጸብጻብ ሓሶት",  // draft – needs native review
  "map.shops.noStock": "ዝተመዝገበ ፍርያት ኣብ መኽዘን የለን።",  // draft – needs native review
  "map.shops.legend": "ድኳን እታወት (ቀለበት ቀጠልያ፦ ዝተረጋገጸ ሸያጢ)",  // draft – needs native review
  "map.disease.scans": "{n} ምርመራታት ስእሊ፣ እቲ ናይ መወዳእታ {date}",  // draft – needs native review
  "map.disease.note": "ብወረዳ ዝተቖጽረ፤ ቦታታት ግራውቲ ፈጺሞም ኣይርኣዩን።",  // draft – needs native review
  "map.legend.dashed": "ነጠብጣብ መስመር፦ ግምታዊ ቦታ።",  // draft – needs native review

  // ── ABC company core (A1) ─────────────────────────────────────────────────
  "nav.abcRules": "ሕግታት ABC",  // draft – needs native review
  "abc.saved": "ተዓቂቡ።",  // draft – needs native review
  "abc.pickCompany": "ትካል",  // draft – needs native review
  "abc.tab.company": "ትካል",  // draft – needs native review
  "abc.role.organizing_committee": "ኣወሃሃዲት ኮሚቴ",  // draft – needs native review
  "abc.role.general_manager": "ዋና ኣመሓዳሪ",  // draft – needs native review
  "abc.role.chair": "ኣቦ መንበር ቦርድ",  // draft – needs native review
  "abc.role.board_member": "ኣባል ቦርድ",  // draft – needs native review
  "abc.role.secretary": "ጸሓፊ",  // draft – needs native review
  "abc.role.accountant": "ሒሳብ ሹም",  // draft – needs native review
  "abc.role.store_keeper": "ሓላፊ መኽዘን",  // draft – needs native review
  "abc.role.machinery_coordinator": "ኣወሃሃዲ ማሽነሪ",  // draft – needs native review
  "abc.role.agronomist": "ኣግሮኖሚስት ABC",  // draft – needs native review
  "abc.role.auditor": "ኦዲተር",  // draft – needs native review
  "abc.rule.min_founding_members": "ዝተሓተ መስረቲ ኣባላት",  // draft – needs native review
  "abc.rule.share_value_min_etb": "ዝተሓተ ዋጋ ሓንቲ ኣክሲዮን",  // draft – needs native review
  "abc.rule.min_shares_per_member": "ንሓደ ኣባል ዝተሓተ ኣክሲዮን",  // draft – needs native review
  "abc.rule.min_paid_capital_etb": "ዝተሓተ ዝተኸፍለ ካፒታል",  // draft – needs native review
  "abc.rule.registration_paid_fraction": "ቅድሚ ምዝገባ ዝኽፈል (ካብ ዝተኣወጀ ካፒታል)",  // draft – needs native review
  "abc.rule.pledge_upfront_fraction": "ቃል ክኣቱ ዝኽፈል (ተወሳኺ ኣክሲዮን)",  // draft – needs native review
  "abc.rule.pledge_deadline_years": "ግዜ ንምኽፋል ቃል ዝተኣትወሎም ኣክሲዮናት",  // draft – needs native review
  "abc.rule.max_ownership_fraction": "ንሓደ ኣባል ዝለዓለ ዋንነት",  // draft – needs native review
  "abc.rule.committee_min": "ኣወሃሃዲት ኮሚቴ፦ ዝተሓተ",  // draft – needs native review
  "abc.rule.committee_max": "ኣወሃሃዲት ኮሚቴ፦ ዝለዓለ",  // draft – needs native review
  "abc.rule.business_plan_years_min": "መደብ ንግዲ፦ ዝተሓተ ዓመታት",  // draft – needs native review
  "abc.rule.business_plan_years_max": "መደብ ንግዲ፦ ዝለዓለ ዓመታት",  // draft – needs native review
  "abc.rule.voting_land_factor": "ክብደት ድምጺ፦ ግደ መሬት",  // draft – needs native review
  "abc.rule.voting_production_factor": "ክብደት ድምጺ፦ ግደ ፍርያት",  // draft – needs native review
  "abc.unit.members": "ኣባላት",  // draft – needs native review
  "abc.unit.shares": "ኣክሲዮናት",  // draft – needs native review
  "abc.unit.years": "ዓመታት",  // draft – needs native review
  "abc.ruleVerified": "ዝተረጋገጸ",  // draft – needs native review
  "abc.rulePlatform": "ናይ መድረኽ ንቡር",  // draft – needs native review
  "abc.ruleDraft": "ንድፊ፦ ኣረጋግጹ",  // draft – needs native review
  "abc.ruleSince": "ካብ {date}",  // draft – needs native review
  "abc.since": "ካብ {date}",  // draft – needs native review
  "abc.company.profile": "መግለጺ ትካል",  // draft – needs native review
  "abc.company.type": "ዓይነት ABC",  // draft – needs native review
  "abc.company.kebele": "ቀበሌ",  // draft – needs native review
  "abc.company.fiscalYear": "ዓመተ ባጀት ዝጅምር",  // draft – needs native review
  "abc.company.declaredCapital": "ዝተኣወጀ ካፒታል (ብር)",  // draft – needs native review
  "abc.company.approvalLimit": "ፍቓድ ቦርድ ዘድልዮ ካብ (ብር) ንላዕሊ",  // draft – needs native review
  "abc.company.approvalLimitHint": "ካብዚ መጠን ንላዕሊ ዝኾኑ ዕድጊታትን መሸጣታትን ፍቓድ ቦርድ የድልዮም።",  // draft – needs native review
  "abc.company.exitPolicy": "ፖሊሲ ምውጻእን ምምላስን ኣባል",  // draft – needs native review
  "abc.company.rules": "ኣብ ስራሕ ዘለዉ ሕጋዊ ሕግታት",  // draft – needs native review
  "abc.company.rulesHint": "ብኣመሓዳሪ ካብ ሕግን መምርሒታትን ዝውሰኑ፤ ንድፍታት ክረጋገጹ ኣለዎም።",  // draft – needs native review
  "abc.company.team": "ጉጅለን ተራታትን",  // draft – needs native review
  "abc.company.teamHint": "ነፍሲ ወከፍ ተራ ኣብዚ ABC ናይ ገዛእ ርእሱ መሰል ይህብ። ሓደ ሰብ ብዙሕ ተራታት፣ ኣብ ካልኦት ABC እውን ተራ ክህልዎ ይኽእል።",  // draft – needs native review
  "abc.company.noTeam": "ገና ተራ ኣይተዋህበን።",  // draft – needs native review
  "abc.company.phone": "ተሌፎን",  // draft – needs native review
  "abc.company.role": "ተራ",  // draft – needs native review
  "abc.company.addRole": "ተራ ሃብ",  // draft – needs native review
  "abc.company.history": "ታሪኽ",  // draft – needs native review
  "abc.company.noHistory": "ገና ዝተመዝገበ ለውጢ የለን።",  // draft – needs native review
  "abc.status.formation": "ኣብ ምምስራት",  // draft – needs native review
  "abc.status.registered": "ዝተመዝገበ",  // draft – needs native review
  "abc.status.suspended": "ዝተኣገደ",  // draft – needs native review
  "abc.status.dissolved": "ዝፈረሰ",  // draft – needs native review
  "abc.type.all": "ኩሎም ዓይነታት",  // draft – needs native review
  "abc.type.crop_grain": "ሰብል / እኽሊ",  // draft – needs native review
  "abc.type.horticulture": "ኣሕምልቲ",  // draft – needs native review
  "abc.type.fruit": "ፍረታት",  // draft – needs native review
  "abc.type.livestock": "እንስሳ",  // draft – needs native review
  "abc.type.mixed": "ሕውስዋስ",  // draft – needs native review
  "abc.fy.hamle": "1 ሓምለ (ዓመተ ባጀት ኢትዮጵያ)",  // draft – needs native review
  "abc.fy.meskerem": "1 መስከረም (ሓድሽ ዓመት ኢትዮጵያ)",  // draft – needs native review
  "abc.fy.january": "1 ጥሪ",  // draft – needs native review
  "abc.action.abc.profile.update": "መግለጺ ትካል ተቐይሩ",  // draft – needs native review
  "abc.action.abc.role.add": "ተራ ተዋሂቡ",  // draft – needs native review
  "abc.action.abc.role.remove": "ተራ ተሰሪዙ",  // draft – needs native review
  "abc.rules.description": "ሕጋዊ ቁጽርታት ንABC (ዝተሓተ ኣባላት፣ ዋጋ ኣክሲዮን፣ ዶብ ዋንነት…)። ዋጋ ካብ ሓንቲ ዕለት ምስ ምንጩ ቀይሩ፤ እቲ ዝነበረ ዋጋ ከም ታሪኽ ይዕቀብ።",  // draft – needs native review
  "abc.rules.all": "ኩሎም ሕግታትን ታሪኾምን",  // draft – needs native review
  "abc.rules.new": "ሓድሽ ዋጋ",  // draft – needs native review
  "abc.rules.newHint": "ካብ ዝሰራዕኩምዋ ዕለት ይሰርሕ። ሕጊ፣ መምርሒ ወይ ውሳነ ምስ ዓንቀጹ ጥቐሱ።",  // draft – needs native review
  "abc.rules.rule": "ሕጊ",  // draft – needs native review
  "abc.rules.value": "ዋጋ",  // draft – needs native review
  "abc.rules.from": "ዝሰርሓሉ ዕለት",  // draft – needs native review
  "abc.rules.source": "ምንጪ",  // draft – needs native review
  "abc.rules.sourceHint": "ንኣብነት መምርሒ ቁ. …፣ ዓንቀጽ …",  // draft – needs native review
  "abc.rules.status": "ተረጋጊጹ?",  // draft – needs native review
  "abc.rules.save": "ሓድሽ ዋጋ ዓቅብ",  // draft – needs native review
  "abc.rules.added": "ተዓቂቡ። ሓድሽ ዋጋ ካብ ዕለቱ ይሰርሕ።",  // draft – needs native review

  // ── ABC formation & registration (A2) ─────────────────────────────────────
  "abc.tab.formation": "ምምስራትን ምዝገባን",  // draft – needs native review
  "abc.rule.board_min_members": "ቦርድ፦ ዝተሓተ ኣባላት (ኣቦ መንበር ሓዊሱ)",  // draft – needs native review
  "abc.form.checklist": "ንምዝገባ ድሉውነት",  // draft – needs native review
  "abc.form.checklistHint": "ካብ {total} {done} ድሉው። ደረታት ካብ ኣብ ስራሕ ዘለዉ ሕግታት ABC ይውሰዱ።",  // draft – needs native review
  "abc.form.haveNeed": "ካብ {need} {have}",  // draft – needs native review
  "abc.form.done": "ተወዲኡ",  // draft – needs native review
  "abc.form.missing": "ይጎድል",  // draft – needs native review
  "abc.form.draftRule": "(ንድፊ ሕጊ፦ ኣረጋግጹ)",  // draft – needs native review
  "abc.form.sharesLater": "ዝተኸፍለ ካፒታል ካብ ክፍሊት ኣክሲዮን ይቑጸር (ኣክሲዮናት፣ A4)።",  // draft – needs native review
  "abc.ready.committee": "ኣወሃሃዲት ኮሚቴ",  // draft – needs native review
  "abc.ready.recognition": "ኮሚቴ ኣፍልጦ ረኺባ (ኣካል፣ ዕለት፣ ደብዳቤ)",  // draft – needs native review
  "abc.ready.members": "መስረቲ ኣባላት",  // draft – needs native review
  "abc.ready.paid_capital": "ዝተኸፍለ ካፒታል",  // draft – needs native review
  "abc.ready.declared_paid": "ካብ ዝተኣወጀ ካፒታል ዝተኸፍለ ግደ",  // draft – needs native review
  "abc.ready.board": "ቦርድ ተመሪጹ (ኣቦ መንበር + ኣባላት)",  // draft – needs native review
  "abc.ready.business_plan": "መደብ ንግዲ ተተሓሒዙ (ዓመታት)",  // draft – needs native review
  "abc.ready.capital_deposit": "መረጋገጺ ተቐማጢ ካፒታል ተተሓሒዙ",  // draft – needs native review
  "abc.ready.agreement": "ውዕል ምምስራት ብኹሎም ኣባላት ተፈሪሙ",  // draft – needs native review
  "abc.doc.recognition": "ደብዳቤ ኣፍልጦ",  // draft – needs native review
  "abc.doc.founding_agreement": "ውዕል ምምስራት / መተሓዳደሪ ሕጊ",  // draft – needs native review
  "abc.doc.business_plan": "መደብ ንግዲ",  // draft – needs native review
  "abc.doc.capital_deposit": "መረጋገጺ ተቐማጢ ካፒታል",  // draft – needs native review
  "abc.doc.registration_certificate": "ምስክር ወረቐት ምዝገባ",  // draft – needs native review
  "abc.doc.minutes": "ቃለ ጉባኤ",  // draft – needs native review
  "abc.doc.other": "ካልእ (ንኣብነት ዝተፈረመ ቅዳሕ)",  // draft – needs native review
  "abc.form.documents": "ሰነዳት",  // draft – needs native review
  "abc.form.documentsHint": "PDF፣ JPEG ወይ PNG ክሳብ 10 MB። ሓድሽ ናይ ተመሳሳሊ ዓይነት ሓድሽ ስሪት እዩ፤ ዝነበሩ ይዕቀቡ።",  // draft – needs native review
  "abc.form.noDocuments": "ገና ሰነድ የለን።",  // draft – needs native review
  "abc.form.kind": "ዓይነት",  // draft – needs native review
  "abc.form.title": "ኣርእስቲ",  // draft – needs native review
  "abc.form.planYears": "ዝሽፍኖም ዓመታት",  // draft – needs native review
  "abc.form.years": "{n} ዓመታት",  // draft – needs native review
  "abc.form.older": "ዝነበረ ስሪት",  // draft – needs native review
  "abc.form.chooseFile": "ፋይል ምረጹ",  // draft – needs native review
  "abc.form.fileTypes": "PDF፣ JPEG ወይ PNG፣ ክሳብ 10 MB",  // draft – needs native review
  "abc.form.upload": "ጽዓን",  // draft – needs native review
  "abc.form.download": "ኣውርድ",  // draft – needs native review
  "abc.form.uploaded": "ተጻዒኑ።",  // draft – needs native review
  "abc.form.recognition": "ኣፍልጦ ኣወሃሃዲት ኮሚቴ",  // draft – needs native review
  "abc.form.recognitionHint": "ብሚኒስትሪ ወይ ብቤት ጽሕፈት ክልል። ቅድም ደብዳቤ ጽዓኑ (ዓይነት፦ ደብዳቤ ኣፍልጦ)።",  // draft – needs native review
  "abc.form.recognizedBy": "ብ{authority} ብ{date} ኣፍልጦ ተዋሂቡ።",  // draft – needs native review
  "abc.form.authority": "ኣካል",  // draft – needs native review
  "abc.form.date": "ዕለት",  // draft – needs native review
  "abc.form.letter": "ደብዳቤ",  // draft – needs native review
  "abc.form.agreement": "ፊርማታት ውዕል ምምስራት",  // draft – needs native review
  "abc.form.signedCount": "ካብ {total} ኣባላት {signed} ስሪት {v} ፈሪሞም።",  // draft – needs native review
  "abc.form.noAgreement": "ፊርማ ንምእካብ ውዕል ምምስራት ጽዓኑ።",  // draft – needs native review
  "abc.form.signedApp": "ብኣፕ ኣረጋጊጹ",  // draft – needs native review
  "abc.form.signedScan": "ብወረቐት ፈሪሙ",  // draft – needs native review
  "abc.form.notSigned": "ኣይፈረመን",  // draft – needs native review
  "abc.form.signHow": "ኣባላት ኣብ ገጽ መግለጺኦም ብኣፕ የረጋግጹ፣ ወይ ዝተፈረመ ቅዳሕ ወረቐት ትምዝግቡ (ቅድም 'ካልእ' ኢልኩም ጽዓንዎ)።",  // draft – needs native review
  "abc.form.member": "ኣባል",  // draft – needs native review
  "abc.form.scan": "ዝተፈረመ ቅዳሕ",  // draft – needs native review
  "abc.form.recordScan": "ፊርማ መዝግብ",  // draft – needs native review
  "abc.form.register": "ምዝገባ",  // draft – needs native review
  "abc.form.notReady": "ቅድም ዝርዝር ኣጻፍፉ፤ ድሕሪኡ ምዝገባ ኣብዚ መዝግቡ።",  // draft – needs native review
  "abc.form.adminOverride": "ዝርዝር ኣይተወድአን። ከም ኣመሓዳሪ ምኽንያቱ ብምጥቃስ ምዝገባ ክትምዝግቡ ትኽእሉ (ንኣብነት ቅድሚ ናብ መድረኽ ምእታዉ ዝተመዝገበ)።",  // draft – needs native review
  "abc.form.readyHint": "ኩሉ ድሉው እዩ። ካብ ኣካል ዝረኸብኩምዎ ምዝገባ መዝግቡ።",  // draft – needs native review
  "abc.form.regAuthority": "መዝጋቢ ኣካል",  // draft – needs native review
  "abc.form.regNumber": "ቁጽሪ ምዝገባ",  // draft – needs native review
  "abc.form.overrideReason": "ምኽንያት (ግዴታ፣ እንተወሓደ 10 ፊደላት)",  // draft – needs native review
  "abc.form.registerButton": "ምዝገባ መዝግብ",  // draft – needs native review
  "abc.form.registered": "ተመዝጊቡ",  // draft – needs native review
  "abc.form.registeredLine": "ብ{authority}፣ ቁጽሪ {number}፣ ብ{date} ተመዝጊቡ።",  // draft – needs native review
  "abc.form.overrideNote": "ዝርዝር ከይተወድአ ብኣመሓዳሪ ዝተመዝገበ፦ {reason}",  // draft – needs native review
  "abcInv.agreementHint": "ውዕል ምምስራት ድሉው እዩ። ኣንብብዎ፣ ድሕሪኡ ከም እትሰማምዑ ኣረጋግጹ።",  // draft – needs native review
  "abcInv.read": "ውዕል ኣንብብ",  // draft – needs native review
  "abcInv.confirm": "ይሰማማዕ፣ ይፍርም",  // draft – needs native review
  "abcInv.signed": "ውዕል ምምስራት ብ{date} ፈሪምኩም።",  // draft – needs native review

  // ── ABC member registry (A3) ──────────────────────────────────────────────
  "abc.reg.title": "መዝገብ ኣባላት",  // draft – needs native review
  "abc.reg.hint": "{n} ኣባላትን ዕድማታትን። ንግራውቲ፣ ፍቓድን ዝርዝርን ኣባል ጠውቑ።",  // draft – needs native review
  "abc.reg.none": "ገና ኣባል የለን።",  // draft – needs native review
  "abc.reg.members": "ኣባላት",  // draft – needs native review
  "abc.reg.women": "ደቂ ኣንስትዮ",  // draft – needs native review
  "abc.reg.youth": "መንእሰያት (15-29)",  // draft – needs native review
  "abc.reg.unknown": "ዘይተመዝገበ",  // draft – needs native review
  "abc.reg.plots": "{n} ግራውቲ፣ {ha} ሄክታር",  // draft – needs native review
  "abc.reg.status.invited": "ተዓዲሙ",  // draft – needs native review
  "abc.reg.status.active": "ኣባል",  // draft – needs native review
  "abc.reg.consentLine": "ፍቓድ፦ {method}፣ ብ{by} ብ{date} ተመዝጊቡ።",  // draft – needs native review
  "abc.reg.irrigated": "ብመስኖ",  // draft – needs native review
  "abc.reg.noPlots": "እዚ ኣባል ግራት ኣይመዝገበን።",  // draft – needs native review
  "abc.reg.gender": "ጾታ",  // draft – needs native review
  "abc.reg.age": "ክሊ ዕድመ",  // draft – needs native review
  "abc.reg.idReason": "ምሉእ ቁጽሪ መንነት ንምንታይ የድልየኩም? (ኣብ መዝገብ ኦዲት ይምዝገብ)",  // draft – needs native review
  "abc.reg.showId": "ምሉእ መንነት ኣርኢ",  // draft – needs native review
  "abc.reg.removeReason": "ኣባል ዝወጽኣሉ ምኽንያት (ኣብ ታሪኽ ይዕቀብ)፦",  // draft – needs native review
  "abc.reg.remove": "ኣባል ይወጽእ",  // draft – needs native review
  "abc.reg.invited": "ዕድመ ተላኢኹ፤ ሓረስታይ ብኣፕ ይቕበል።",  // draft – needs native review
  "abc.reg.created": "ሕሳብ ተፈጢሩ፣ ኣባል ተወሲኹ። ግዝያዊ PIN ንሓረስታይ ሃቡ።",  // draft – needs native review
  "abc.reg.added": "ኣባል ተወሲኹ።",  // draft – needs native review
  "abc.reg.enrol": "ኣባል መዝግብ",  // draft – needs native review
  "abc.reg.enrolHint": "ዘሎ ሓረስታይ፦ ተሌፎን ጥራይ። ሓድሽ ሓረስታይ፦ ሽም፣ ወረዳን ግዝያዊ PIN ውን።",  // draft – needs native review
  "abc.reg.consent": "ፍቓድ",  // draft – needs native review
  "abc.reg.newHint": "ሕሳብ ንዘይብሉ ሓረስታይ ጥራይ፦",  // draft – needs native review
  "abc.reg.name": "ምሉእ ሽም",  // draft – needs native review
  "abc.reg.pin": "ግዝያዊ PIN (6+ ኣሃዝ)",  // draft – needs native review
  "abc.reg.idType": "ዓይነት መንነት",  // draft – needs native review
  "abc.reg.idNumber": "ቁጽሪ መንነት (ኣማራጺ)",  // draft – needs native review
  "abc.reg.idHint": "ብምስጢር ይዕቀብ፤ ናይ መወዳእታ 4 ኣሃዛት ጥራይ ይርኣዩ።",  // draft – needs native review
  "abc.reg.enrolButton": "መዝግብ",  // draft – needs native review
  "abc.reg.import": "ኣባላት ኣእቱ (CSV)",  // draft – needs native review
  "abc.reg.importHint": "ንብዙሓት ኣባላት፣ ንኣብነት ማሕበር ክትቕይሩ ከለኹም። ቅድም ፋይል ኣረጋግጹ፤ ክሳብ እተእትዉ ዋላ ሓንቲ ኣይዕቀብን።",  // draft – needs native review
  "abc.reg.check": "ፋይል ኣረጋግጽ",  // draft – needs native review
  "abc.reg.importButton": "{n} ኣባላት ኣእቱ",  // draft – needs native review
  "abc.reg.checkResult": "{rows} መስመራት፦ {ok} ድሉው ({created} ሓደስቲ ሕሳባት)፣ {errors} ጸገም ዘለዎም።",  // draft – needs native review
  "abc.reg.importResult": "ካብ {rows} መስመራት {ok} ኣትዮም ({created} ሓደስቲ ሕሳባት)፤ {errors} ተሓሊፎም።",  // draft – needs native review
  "abc.reg.line": "መስመር {line}",  // draft – needs native review
  "abc.gender.female": "ጓል ኣንስተይቲ",  // draft – needs native review
  "abc.gender.male": "ወዲ ተባዕታይ",  // draft – needs native review
  "abc.consent.app": "ብኣፕ (ዕድመ)",  // draft – needs native review
  "abc.consent.spoken": "ብቓል፣ ብሰራሕተኛ ዝተመዝገበ",  // draft – needs native review
  "abc.consent.paper": "ዝተፈረመ ቅጥዒ ወረቐት",  // draft – needs native review
  "abc.idType.fayda": "ፋይዳ (ሃገራዊ መንነት)",  // draft – needs native review
  "abc.idType.kebele_id": "መንነት ቀበሌ",  // draft – needs native review
  "abc.idType.other": "ካልእ መንነት",  // draft – needs native review

  // ── ABC shares (A4) ───────────────────────────────────────────────────────
  "abc.tab.shares": "ኣክሲዮናት",  // draft – needs native review
  "rule.share_value_min": "ሓንቲ ኣክሲዮን እንተወሓደ {minimum} ብር ክትከውን ኣለዋ (ሕግታት ABC)።",  // draft – needs native review
  "rule.min_shares": "ቀዳማይ ቃል ኣባል እንተወሓደ {minimum} ኣክሲዮናት ክኸውን ኣለዎ።",  // draft – needs native review
  "rule.ownership_cap": "ዝኾነ ኣባል ካብ ዝቐረቡ {offered} ኣክሲዮናት ልዕሊ {percent}% ({limit} ኣክሲዮናት) ክሕዝ ኣይክእልን። እዚ {after} ይገብሮ።",  // draft – needs native review
  "rule.pledge_upfront": "ተወሰኽቲ ኣክሲዮናት ቃል ክኣቱ እንተወሓደ {percent}% ክኽፈሉ ኣለዎም፦ {amount} ብር።",  // draft – needs native review
  "abc.sh.setup": "ካፒታል ኣክሲዮን",  // draft – needs native review
  "abc.sh.rulesLine": "ኣብ ስራሕ ዘለዉ ሕግታት፦ ንሓደ ኣባል እንተወሓደ {min} ኣክሲዮናት፣ ነፍሲ ወከፍ ልዕሊ {cap}% ኣይኮነን፣ ኣብ ተወሰኽቲ {upfront}% ቅድሚት፣ እቲ ዝተረፈ ኣብ {years} ዓመታት።",  // draft – needs native review
  "abc.sh.pledgedShares": "ቃል ዝተኣትወሎም ኣክሲዮናት",  // draft – needs native review
  "abc.sh.issuedShares": "ዝተዋህቡ ኣክሲዮናት",  // draft – needs native review
  "abc.sh.paidTotal": "ዝተኸፍለ",  // draft – needs native review
  "abc.sh.subscribed": "ካብ ዝቐረቡ ኣክሲዮናት",  // draft – needs native review
  "abc.sh.shareValue": "ዋጋ ሓንቲ ኣክሲዮን (ብር)",  // draft – needs native review
  "abc.sh.sharesOffered": "ዝቐረቡ ኣክሲዮናት",  // draft – needs native review
  "abc.sh.capLine": "ዶብ ዋንነት፦ ንሓደ ኣባል {n} ኣክሲዮናት።",  // draft – needs native review
  "abc.sh.setFirst": "ቅድም ዋጋ ኣክሲዮንን ብዝሒ ዝቐረቡ ኣክሲዮናትን ኣቐምጡ።",  // draft – needs native review
  "abc.sh.members": "ኣክሲዮናት ኣባላት",  // draft – needs native review
  "abc.sh.membersHint": "ቃል ወይ ክፍሊት ንምምዝጋብ ኣባል ጠውቑ። ኣክሲዮናት ብዝተኸፍሉሉ መጠን ይወሃቡ።",  // draft – needs native review
  "abc.sh.memberLine": "{held} ኣክሲዮናት ተታሒዞም · {pledged} ቃል · ዝተኸፍለ {paid} · ዝተረፈ {owed}",  // draft – needs native review
  "abc.sh.kind.minimum": "ዝተሓተ ቃል",  // draft – needs native review
  "abc.sh.kind.extra": "ተወሳኺ ቃል",  // draft – needs native review
  "abc.sh.sharesN": "{n} ኣክሲዮናት",  // draft – needs native review
  "abc.sh.dueOn": "ክሳብ {date} ይኽፈል",  // draft – needs native review
  "abc.sh.paidOwed": "ዝተኸፍለ {paid} · ዝተረፈ {owed}",  // draft – needs native review
  "abc.sh.amount": "መጠን (ብር)",  // draft – needs native review
  "abc.sh.method": "መንገዲ ክፍሊት",  // draft – needs native review
  "abc.sh.reference": "መወከሲ ቁጽሪ",  // draft – needs native review
  "abc.sh.recordPayment": "ክፍሊት መዝግብ",  // draft – needs native review
  "abc.sh.paid": "ክፍሊት ተመዝጊቡ፤ ቅብሊት ናብ ኣባል ተላኢኹ።",  // draft – needs native review
  "abc.sh.minimumShares": "ዝተሓተ ቃል (ኣክሲዮናት)",  // draft – needs native review
  "abc.sh.extraShares": "ተወሰኽቲ ኣክሲዮናት",  // draft – needs native review
  "abc.sh.addPledge": "ቃል መዝግብ",  // draft – needs native review
  "abc.sh.pledged": "ቃል ተመዝጊቡ።",  // draft – needs native review
  "abc.sh.minimumHint": "ቀዳማይ ቃል፦ እንተወሓደ {n} ኣክሲዮናት፤ ብምሉኡ ክኽፈል ኣለዎ።",  // draft – needs native review
  "abc.sh.extraHint": "ተወሰኽቲ ኣክሲዮናት፦ ሕጂ እንተወሓደ {pct}% ክፈሉ፣ እቲ ዝተረፈ ኣብ {years} ዓመታት።",  // draft – needs native review
  "abc.sh.printCertificate": "ምስክር ወረቐት ኣክሲዮን ሕተም",  // draft – needs native review
  "abc.sh.certificate": "ምስክር ወረቐት ኣክሲዮን",  // draft – needs native review
  "abc.sh.certFor": "ኣባል፦ {name} (ቁጽሪ ኣባል {no})",  // draft – needs native review
  "abc.sh.certHeld": "ዝተታሕዙ ኣክሲዮናት፦ {n}፣ ዋጋ ሓንቲ ኣክሲዮን፦ {value}",  // draft – needs native review
  "abc.sh.certNo": "ቁጽሪ ምስክር ወረቐት",  // draft – needs native review
  "abc.sh.shares": "ኣክሲዮናት",  // draft – needs native review
  "abc.sh.approvals": "ፍቓድ ቦርድ",  // draft – needs native review
  "abc.sh.approvalsHint": "ካልእ ኣባል ቦርድ ይውስን፤ ዝሓተተ ሰብ ንሕቶኡ ከጽድቕ ኣይክእልን።",  // draft – needs native review
  "abc.sh.transferLine": "{shares} ኣክሲዮናት ምትሕልላፍ፦ {from} → {to}",  // draft – needs native review
  "abc.appr.pending": "ይጽበ",  // draft – needs native review
  "abc.appr.approved": "ጸዲቑ",  // draft – needs native review
  "abc.appr.rejected": "ተነጺጉ",  // draft – needs native review
  "abc.appr.approve": "ኣጽድቕ",  // draft – needs native review
  "abc.appr.reject": "ንጸግ",  // draft – needs native review
  "abc.sh.transfer": "ኣክሲዮናት ምትሕልላፍ",  // draft – needs native review
  "abc.sh.transferHint": "ኣብ መንጎ ኣባላት (መሸጣ፣ ውርሻ፣ ምውጻእ)። ቦርድ ከጽድቕ ኣለዎ።",  // draft – needs native review
  "abc.sh.from": "ካብ",  // draft – needs native review
  "abc.sh.to": "ናብ",  // draft – needs native review
  "abc.sh.reason": "ምኽንያት",  // draft – needs native review
  "abc.sh.reasonHint": "መሸጣ፣ ውርሻ፣ ምውጻእ…",  // draft – needs native review
  "abc.sh.askApproval": "ንቦርድ ሕተት",  // draft – needs native review
  "abc.sh.transferSent": "ንፍቓድ ናብ ቦርድ ተላኢኹ።",  // draft – needs native review
  "abc.sh.payments": "ክፍሊታትን ቅብሊታትን",  // draft – needs native review
  "abc.sh.reverse": "ሰርዝ",  // draft – needs native review
  "abc.sh.reverseReason": "ነዚ ክፍሊት ትሰርዝሉ ምኽንያት (ንኣብነት ዘይተዓወተ ምትሕልላፍ)፦",  // draft – needs native review
  "abc.sh.reminders": "መዘኻኸሪ ክፍሊት ስደድ",  // draft – needs native review
  "abc.sh.remindersSent": "{n} መዘኻኸርታት ተላኢኾም (ኣብ 30 መዓልቲ ዝበጽሑ ወይ ዝሓለፎም ቃላት)።",  // draft – needs native review
  "abc.flag.overdue": "ክፍሊት ደንጒዩ",  // draft – needs native review
  "abc.flag.due_soon": "ቀረባ ይበጽሕ",  // draft – needs native review
  "abc.flag.minimum_unpaid": "ዝተሓተ ብምሉኡ ኣይተኸፍለን",  // draft – needs native review
  "abc.flag.no_minimum": "ገና ቃል የለን",  // draft – needs native review
  "abc.flag.over_cap": "ልዕሊ ዶብ ዋንነት",  // draft – needs native review
  "abc.pay.cash": "ጥረ ገንዘብ",  // draft – needs native review
  "abc.pay.bank": "ባንክ",  // draft – needs native review
  "abc.pay.telebirr": "ቴሌብር",  // draft – needs native review
  "abc.pay.mpesa": "ኤም-ፔሳ",  // draft – needs native review
  "abc.pay.other": "ካልእ",  // draft – needs native review
  "abc.action.abc.share.pledge": "ኣክሲዮን ቃል ተኣትዩ",  // draft – needs native review
  "abc.action.abc.share.payment": "ክፍሊት ኣክሲዮን ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.share.payment_reverse": "ክፍሊት ኣክሲዮን ተሰሪዙ",  // draft – needs native review
  "abc.action.abc.share.transfer_request": "ምትሕልላፍ ኣክሲዮን ተሓቲቱ",  // draft – needs native review
  "abc.action.abc.approval.decide": "ውሳነ ቦርድ",  // draft – needs native review
  "abc.action.abc.document.upload": "ሰነድ ተጻዒኑ",  // draft – needs native review
  "abc.action.abc.formation.recognition": "ኣፍልጦ ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.agreement.sign": "ውዕል ምምስራት ተፈሪሙ",  // draft – needs native review
  "abc.action.abc.registration": "ምዝገባ ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.member.enrol": "ኣባል ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.member.update": "ዝርዝር ኣባል ተቐይሩ",  // draft – needs native review
  "abc.action.abc.member.id_view": "ምሉእ ቁጽሪ መንነት ተራእዩ",  // draft – needs native review
  "abc.action.abc.member.import": "ኣባላት ኣትዮም",  // draft – needs native review
  "abc.action.abc.member.remove": "ኣባል ወጺኡ",  // draft – needs native review

  // ── ABC voting & meetings (A5) ────────────────────────────────────────────
  "abc.tab.meetings": "ኣኼባታትን ድምጽታትን",  // draft – needs native review
  "abc.rule.quorum_fraction": "ምልኣተ ጉባኤ (ግደ ክብደት ድምጺ / ዝተረኽቡ ኣባላት ቦርድ)",  // draft – needs native review
  "abc.rule.motion_pass_fraction": "ውሳነ ዝሓልፍ ካብ (ግደ ብክብደት እወ + ኣይፋል) ንላዕሊ ክኸውን ከሎ",  // draft – needs native review
  "abc.vote.weights": "ክብደት ድምጺ",  // draft – needs native review
  "abc.vote.formula": "ክብደት = {land} × ግደ መሬት + {prod} × ግደ ፍርያት (ሕግታት ABC)።",  // draft – needs native review
  "abc.vote.landOnly": "ነዚ ወቕቲ ፍርያት ኣይተመዝገበን፤ ክብደት ግደ መሬት ጥራይ እዩ።",  // draft – needs native review
  "abc.vote.equal": "ገና መሬት ወይ ፍርያት ኣይተመዝገበን፤ ኩሎም ኣባላት ማዕረ ክብደት ኣለዎም።",  // draft – needs native review
  "abc.vote.season": "ወቕቲ",  // draft – needs native review
  "abc.vote.newSeason": "ሓድሽ ወቕቲ (ፍርያት ንምምዝጋብ)",  // draft – needs native review
  "abc.vote.land": "መሬት",  // draft – needs native review
  "abc.vote.production": "ፍርያት",  // draft – needs native review
  "abc.vote.weight": "ክብደት",  // draft – needs native review
  "abc.vote.weightsHint": "መሬት፦ ዝተመዝገቡ ግራውቲ ኣባላት። ፍርያት፦ ABC ነቲ ወቕቲ ዝመዝገቦ (ክሳብ ምእታው ፍርያት ግምት)። ጉባኤ ክምደብ ከሎ ዝተዓጽወ ክብደት ይጥቀም።",  // draft – needs native review
  "abc.meet.list": "ኣኼባታት",  // draft – needs native review
  "abc.meet.none": "ገና ኣኼባ የለን።",  // draft – needs native review
  "abc.meet.new": "ኣኼባ መድብ",  // draft – needs native review
  "abc.meet.newHint": "ሓፈሻዊ ጉባኤ ክብደት ድምጺ ሕጂ ይዓጹ። ድሕሪኡ መፍለጢ ስደዱ።",  // draft – needs native review
  "abc.meet.kind": "ዓይነት",  // draft – needs native review
  "abc.meet.kind.general_assembly": "ሓፈሻዊ ጉባኤ",  // draft – needs native review
  "abc.meet.kind.board": "ኣኼባ ቦርድ",  // draft – needs native review
  "abc.meet.when": "ዕለትን ሰዓትን",  // draft – needs native review
  "abc.meet.place": "ቦታ",  // draft – needs native review
  "abc.meet.agenda": "ኣጀንዳ",  // draft – needs native review
  "abc.meet.agendaHint": "ኣብ ሓደ መስመር ሓደ ጉዳይ",  // draft – needs native review
  "abc.meet.create": "መድብ",  // draft – needs native review
  "abc.meet.status.scheduled": "ተመዲቡ",  // draft – needs native review
  "abc.meet.status.held": "ተኻይዱ",  // draft – needs native review
  "abc.meet.status.cancelled": "ተሰሪዙ",  // draft – needs native review
  "abc.meet.sendNotice": "ንመረጽቲ መፍለጢ ስደድ",  // draft – needs native review
  "abc.meet.noticeAgain": "መፍለጢ ደጊምካ ስደድ",  // draft – needs native review
  "abc.meet.noticeSent": "መፍለጢ ብኣፕን ቴሌግራምን ተላኢኹ።",  // draft – needs native review
  "abc.meet.cancel": "ኣኼባ ሰርዝ",  // draft – needs native review
  "abc.meet.attendance": "ተረኽቦ",  // draft – needs native review
  "abc.meet.quorumBadge": "ምልኣተ ጉባኤ {pct} (ዘድሊ {need})",  // draft – needs native review
  "abc.meet.quorumLine": "ዝተረኽቡ፦ ካብ {eligible} መረጽቲ {present} ({pct} ካብ ክብደት ድምጺ)።",  // draft – needs native review
  "abc.meet.saveAttendance": "ተረኽቦ ዓቅብ",  // draft – needs native review
  "abc.meet.motions": "ሓሳባት ውሳነ",  // draft – needs native review
  "abc.meet.noMotions": "ገና ሓሳብ ውሳነ የለን።",  // draft – needs native review
  "abc.meet.newMotion": "ሓድሽ ሓሳብ ውሳነ",  // draft – needs native review
  "abc.meet.addMotion": "ወስኽ",  // draft – needs native review
  "abc.meet.minutes": "ቃለ ጉባኤ",  // draft – needs native review
  "abc.meet.saveMinutes": "ንድፊ ዓቅብ",  // draft – needs native review
  "abc.meet.approveMinutes": "ቃለ ጉባኤ ኣጽድቕ",  // draft – needs native review
  "abc.meet.approvedBy": "ብ{name} ብ{date} ጸዲቑ።",  // draft – needs native review
  "abc.meet.print": "ቃለ ጉባኤ ሕተም",  // draft – needs native review
  "abc.motion.yes": "እወ",  // draft – needs native review
  "abc.motion.no": "ኣይፋል",  // draft – needs native review
  "abc.motion.abstain": "ተዓቒቡ",  // draft – needs native review
  "abc.motion.tally": "እወ {yes} ({ny}) · ኣይፋል {no} ({nn}) · ተዓቒቡ {abstain} ({na})",  // draft – needs native review
  "abc.motion.saveVotes": "ድምጽታት ዓቅብ",  // draft – needs native review
  "abc.motion.close": "ድምጺ ምሃብ ዕጸው",  // draft – needs native review
  "abc.motion.result.open": "ክፉት",  // draft – needs native review
  "abc.motion.result.passed": "ሓሊፉ",  // draft – needs native review
  "abc.motion.result.failed": "ኣይሓለፈን",  // draft – needs native review
  "abc.motion.result.no_quorum": "ምልኣተ ጉባኤ የለን",  // draft – needs native review
  "abc.action.abc.production.record": "ፍርያት ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.voting.snapshot": "ክብደት ድምጺ ተዓጽዩ",  // draft – needs native review
  "abc.action.abc.meeting.create": "ኣኼባ ተመዲቡ",  // draft – needs native review
  "abc.action.abc.meeting.notice": "መፍለጢ ኣኼባ ተላኢኹ",  // draft – needs native review
  "abc.action.abc.meeting.attendance": "ተረኽቦ ተመዝጊቡ",  // draft – needs native review
  "abc.action.abc.meeting.cancel": "ኣኼባ ተሰሪዙ",  // draft – needs native review
  "abc.action.abc.motion.create": "ሓሳብ ውሳነ ተወሲኹ",  // draft – needs native review
  "abc.action.abc.motion.votes": "ድምጽታት ኣትዮም",  // draft – needs native review
  "abc.action.abc.motion.close": "ድምጺ ምሃብ ተዓጽዩ",  // draft – needs native review
  "abc.action.abc.minutes.draft": "ቃለ ጉባኤ ተነዲፉ",  // draft – needs native review
  "abc.action.abc.minutes.approve": "ቃለ ጉባኤ ጸዲቑ",  // draft – needs native review
  "abc.action.abc.vote.confirm": "ኣባል ድምጹ ኣረጋጊጹ",  // draft – needs native review
  "abcInv.voteRecorded": "ኣብ \"{meeting}\" ድምጽኹም ኣብ \"{motion}\" ከምዚ ተመዝጊቡ፦ {choice}። ቅኑዕ ድዩ?",  // draft – needs native review
  "abcInv.voteCorrect": "እወ፣ ቅኑዕ እዩ",  // draft – needs native review
  "abcInv.voteWrong": "ኣይፋል፣ ጌጋ እዩ",  // draft – needs native review
};
