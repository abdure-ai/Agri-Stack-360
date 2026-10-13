// i18n/om.ts — Afaan Oromoo. DRAFT translation: needs review by a native speaker.
// Keys must match en.ts exactly (TypeScript checks it); keep {placeholders} unchanged.
import type { MessageKey } from "./en";

export const om: Record<MessageKey, string> = {

  // ── App & shared ───────────────────────────────────────────────────────────
  "app.name": "Agri-Stack 360",
  "app.home": "Fuula jalqabaa Agri-Stack 360",
  "lang.label": "Afaan",
  "lang.choose": "Afaan filadhu",
  "common.loading": "Fe'aa jira…",
  "common.cancel": "Haqi",
  "common.confirm": "Mirkaneessi",
  "common.save": "Olkaa'i",
  "common.saveChanges": "Jijjiirama olkaa'i",
  "common.saving": "Olkaa'aa jira…",
  "common.close": "Cufi",
  "common.edit": "Gulaali",
  "common.delete": "Haqi",
  "common.add": "Dabali",
  "common.back": "Deebi'i",
  "common.next": "Itti aanu",
  "common.search": "Barbaadi",
  "common.retry": "Irra deebi'ii yaali",
  "common.refresh": "Haaromsi",
  "common.all": "Hunda",
  "common.none": "Homaa",
  "common.yes": "Eeyyee",
  "common.no": "Lakki",
  "common.optional": "Filannoo",
  "common.required": "Barbaachisaa",
  "common.home": "Fuula jalqabaa",
  "common.you": "Ati",
  "common.actions": "Gochaalee",
  "common.status": "Haala",
  "common.name": "Maqaa",
  "common.phone": "Bilbila",
  "common.region": "Naannoo",
  "common.zone": "Godina",
  "common.woreda": "Aanaa",
  "common.date": "Guyyaa",
  "common.total": "Waliigala",
  "common.active": "Hojii irra",
  "common.inactive": "Hojii ala",
  "common.unknown": "Hin beekamne",
  "common.notSet": "Hin guutamne",
  "common.showMore": "Dabalata agarsiisi",
  "common.showLess": "Xiqqeessi",
  "common.download": "Buusi",
  "common.exportCsv": "CSV buusi",
  "common.viewAll": "Hunda ilaali",
  "common.demoData": "Odeeffannoo agarsiisaa",  // draft – needs native review
  "common.toggleSidebar": "Tarree cinaa bani/cufi",
  "common.mainNavigation": "Qajeelcha ijoo",
  "common.breadcrumb": "Karaa fuulaa",
  "common.toggleTheme": "Ifaa / dukkana jijjiiri",
  "state.somethingWrong": "Rakkoon uumameera",
  "state.somethingWrongDot": "Rakkoon uumameera.",
  "state.checkingAccount": "Herrega kee mirkaneessaa jira…",
  "error.unreachable": "{service} argachuun hin danda'amne. Hojii irra jiraachuu isaa mirkaneessiitii irra deebi'ii yaali.",
  "service.server": "sarvara",
  "service.platform": "sarvara Agri-Stack",
  "service.market": "tajaajila ragaa gabaa",
  "service.forecast": "tajaajila tilmaamaa",
  "service.sync": "tajaajila walsimsiisa ragaa",
  "notFound.title": "Fuulli hin argamne",
  "notFound.description": "Fuulli kun hin jiru",
  "notFound.error": "DOGOGGORA",
  "notFound.message": "Fuula barbaaddu argachuu hin dandeenye.",
  "notFound.back": "Gara daashboordiitti deebi'i",

  // ── Navigation ─────────────────────────────────────────────────────────────
  "nav.menu": "Baafata",
  "nav.account": "Herrega",
  "nav.userManagement": "Bulchiinsa fayyadamtootaa",
  "nav.administration": "Bulchiinsa",
  "nav.dashboard": "Daashboordii",
  "nav.market": "Odeeffannoo gabaa",
  "nav.cropHealth": "Fayyaa midhaanii",
  "nav.inputs": "Dhiyeessitoota galtee",
  "nav.financial": "Faayinaansii",
  "nav.advisory": "Gorsa AI",
  "nav.profile": "Ibsa koo",
  "nav.users": "Fayyadamtoota",
  "nav.roles": "Gahee",
  "nav.permissions": "Hayyama",
  "nav.dataSync": "Walsimsiisa ragaa",
  "nav.knowledge": "Kuusaa beekumsaa",
  "header.profileFarms": "Ibsa koo fi lafa qonnaa",
  "header.signOut": "Ba'i",

  // ── Roles ──────────────────────────────────────────────────────────────────
  "role.farmer": "Qonnaan bulaa",
  "role.agent": "Hojjetaa misoomaa",
  "role.trader": "Daldalaa",
  "role.admin": "Bulchaa",

  // ── Layout ─────────────────────────────────────────────────────────────
  "sidebar.dataNote": "Gatiin gabaa Sirna Odeeffannoo Gabaa Biyyaalessaa (NMIS) irraa dhufa; Agri-Stack 360n guyyaa guyyaan haaromsa.",

  // ── Glossary: crops, regions, units, categories, months ────────────────
  "crop.avocado": "Avookaadoo",
  "crop.banana": "Muuzii",
  "crop.bean": "Boloqqee",
  "crop.garlic": "Qullubbii adii",
  "crop.green_mung": "Maashoo",
  "crop.local_rice": "Ruuzii biyya keessaa",
  "crop.maize": "Boqqolloo",
  "crop.malt_barely": "Garbuu biiraa",
  "crop.malt_barley": "Garbuu biiraa",
  "crop.barley": "Garbuu",
  "crop.mango": "Maangoo",
  "crop.onion": "Qullubbii diimaa",
  "crop.pineapple": "Anaanaasii",
  "crop.potato": "Dinnicha",
  "crop.red_pepper": "Barbaree",
  "crop.sesame": "Saliixa",
  "crop.sorghum": "Mishingaa",
  "crop.soybean": "Sooyaa biinii",
  "crop.teff": "Xaafii",
  "crop.tomato": "Timaatima",
  "crop.wheat": "Qamadii",
  "crop.coffee": "Buna",
  "crop.chickpea": "Shumburaa",
  "crop.faba_bean": "Baaqelaa",
  "region.addis_ababa": "Finfinnee",
  "region.afar": "Affaar",
  "region.amhara": "Amaaraa",
  "region.benishangul-gumuz": "Beenishaangul Gumuz",
  "region.central_ethiopia": "Itoophiyaa Giddugaleessaa",
  "region.dire_dawa": "Dirree Dawaa",
  "region.gambela": "Gaambellaa",
  "region.harari": "Hararii",
  "region.oromia": "Oromiyaa",
  "region.sidama": "Sidaamaa",
  "region.somali": "Somaalee",
  "region.south_ethiopia": "Itoophiyaa Kibbaa",
  "region.south_west_ethiopia": "Itoophiyaa Kibba Lixaa",
  "region.south_west": "Kibba Lixaa",
  "region.snnp": "NNSK Kibbaa",
  "region.tigray": "Tigraay",
  "unit.quintal": "Kuntaala",
  "unit.kg": "kg",
  "unit.etb": "Birrii",
  "category.seeds": "Sanyii",
  "category.fertilizer": "Xaa'oo",
  "category.fungicide": "Farra fangasii",
  "category.herbicide": "Farra aramaa",
  "category.insecticide": "Farra ilbiisotaa",
  "month.1": "Ama",
  "month.2": "Gur",
  "month.3": "Bit",
  "month.4": "Elb",
  "month.5": "Caam",
  "month.6": "Wax",
  "month.7": "Ado",
  "month.8": "Hag",
  "month.9": "Ful",
  "month.10": "Onk",
  "month.11": "Sad",
  "month.12": "Mud",
  "time.seconds": "sekondii {n}",
  "time.minutes": "daqiiqaa {n}",
  "time.hoursMinutes": "sa'aatii {h} daqiiqaa {m}",

  // ── Sign in / sign up ──────────────────────────────────────────────────
  "auth.tagline": "Odeeffannoo gabaa qonnaa qonnaan bultoota, daldaltootaa fi hojjettoota misoomaa Itoophiyaaf.",
  "auth.point1": "Gatii midhaanii torbanii gabaa 300 ol Itoophiyaa guutuu irraa",
  "auth.point2": "Tilmaama gatii yoom gurguruu akka qabdu murteessuuf si gargaaru",
  "auth.point3": "Qorannoo fayyaa midhaanii, dhiyeessitoota galtee fi filannoo liqii",

  // ── Forms ──────────────────────────────────────────────────────────────
  "form.phone": "Lakkoofsa bilbilaa",
  "form.password": "Jecha icciitii",
  "form.passwordPlaceholder": "Jecha icciitii kee galchi",
  "form.confirmPassword": "Jecha icciitii mirkaneessi",
  "form.hidePassword": "Jecha icciitii dhoksi",
  "form.showPassword": "Jecha icciitii agarsiisi",
  "form.fullName": "Maqaa guutuu",
  "form.language": "Afaan",
  "form.role": "Gahee",

  // ── Sign in ────────────────────────────────────────────────────────────
  "signin.title": "Seeni",
  "signin.subtitle": "Lakkoofsa bilbilaa fi jecha icciitii kee galchi.",
  "signin.missing": "Lakkoofsa bilbilaa fi jecha icciitii kee galchi.",
  "signin.noAccount": "Herrega hin qabduu?",
  "signin.createOne": "Haaraa bani",
  "signin.demoAccounts": "Seensa ariifataa",  // draft – needs native review

  // ── Sign up ────────────────────────────────────────────────────────────
  "signup.metaTitle": "Herrega bani",
  "signup.title": "Herrega kee bani",
  "signup.subtitle": "Daqiiqaa tokko gadi fudhata.",
  "signup.passwordHint": "Yoo xiqqaate qubee 6",
  "signup.repeatPassword": "Jecha icciitii irra deebi'i",
  "signup.iAmA": "Ani",
  "signup.agentNote": "Hojjetaa misoomaa dhaa? Akka qonnaan bulaatti galmaa'iitii bulchaan kee herrega kee akka jijjiiru gaafadhu.",
  "signup.woredaNote": "Haalli qilleensaa, gatii fi akeekkachiisni dhukkubaa iddoo itti qonnu waliin akka walsimuuf aanaa kee filadhu.",
  "signup.submit": "Herrega bani",
  "signup.haveAccount": "Herrega qabdaa?",
  "signup.errName": "Maqaa kee guutuu galchi.",
  "signup.errPhone": "Lakkoofsa bilbilaa dijiitii 10 0n jalqabu galchi, fkn. 0911234567.",
  "signup.errPassword": "Jechi icciitii yoo xiqqaate qubee 6 ta'uu qaba.",
  "signup.errMismatch": "Jechoonni icciitii lamaan walsimuu hin dandeenye.",
  "signup.errRegion": "Naannoo kee filadhu.",

  // ── Market insights (plain-language analysis) ──────────────────────────
  "ins.thisCrop": "Midhaan kun",
  "ins.unit": "safartuu",
  "ins.cropInRegion": "{crop} {region} keessatti",
  "ins.ts.up": "Gatiin {crop} yeroo kana keessatti %{pct} OL ka'eera.",
  "ins.ts.down": "Gatiin {crop} yeroo kana keessatti %{pct} GAD bu'eera.",
  "ins.ts.flat": "Gatiin {crop} yeroo kana keessatti baay'ee hin jijjiiramne.",
  "ins.ts.rising": "Gatiin ol ka'aa jira. Kun yeroo baay'ee bittoonni baay'achuu ykn midhaan gabaa irra jiru xiqqaachuu agarsiisa.",
  "ins.ts.slowUp": "Gatiin suuta ol ka'aa jira. Dabalata giddugaleessaa dha — gabaan xiqqoo qaalaa'aa jira.",
  "ins.ts.falling": "Gatiin gad bu'aa jira. Kun yeroo baay'ee midhaan baay'achuu ykn amma bittoonni xiqqaachuu agarsiisa.",
  "ins.ts.slowDown": "Gatiin suuta gad bu'aa jira. Midhaan dabalataa gara gabaatti seenaa jiraachuu danda'a.",
  "ins.ts.steady": "Gatiin tasgabbaa'eera. Gabaan baay'ee hin jijjiiramne — bittootaa fi gurgurtoonni walqixxummaa irra jiru.",
  "ins.ts.belowPeak": "Gatiin olaanaan {month} keessa {peak} ture. Gatiin har'aa ({now}) gatii olaanaa sana irra %{pct} gadi.",
  "ins.ts.nearPeak": "Gatiin gatii olaanaa {peak}, kan dhuma irratti {month} keessa mul'ate, bira ga'eera. Gabaan amma cimaa dha.",
  "ins.ts.volatile": "Gatiin torban torbaniin baay'ee ol ka'a gad bu'a. Gatii argattu tilmaamuun ulfaataa dha. Hunda yeroo tokkotti utuu hin taane xiqqoo xiqqoon gurguruu yaali.",
  "ins.ts.moderate": "Gatiin torban torbaniin xiqqoo jijjiirama, garuu baay'ee miti. Kun midhaan hedduuf idilee dha.",
  "ins.ts.stable": "Gatiin baay'ee tasgabbaa'aa dha. Gurgurtaa kee amanamummaa caalaan karoorfachuu dandeessa.",
  "ins.ts.momUp": "Torbanoota 4 darban keessatti gatiin saffisaan OL ka'aa ture. Yeroo gurgurtaaf gaarii ta'uu danda'a.",
  "ins.ts.momDown": "Torbanoota 4 darban keessatti gatiin GAD bu'aa ture. Gatiin caalaa gad bu'uu dura dafii gurguruu yaadi.",
  "ins.reg.different": "Gatiin {crop} amma naannolee gidduutti baay'ee garaa garaa dha. {max} kan caalu kaffala, {min} kan gadi aanu kaffala.",
  "ins.reg.similar": "Gatiin {crop} naannolee baay'ee keessatti walfakkaata. Garaagarummaan bakkeewwan gidduu xiqqaa dha.",
  "ins.reg.bestWorst": "Yoo {max} keessatti gurgurte, gara {maxPrice} argachuu dandeessa. {min} keessatti gatiin gadi aanaa dha, {minPrice}. Garaagarummaan {unit} tokkoof {diff} dha.",
  "ins.reg.average": "Gatiin giddugaleessaa naannolee {n} hundaa {price} dha. Gatii gabaa naannoo keetti siif dhiyaatu wajjin walbira qabuuf itti fayyadami.",
  "ins.reg.converging": "Gatiin naannolee gidduu yeroo irraa gara yerootti walitti dhihaachaa dhufeera. Amma naannoo kamitti gurguruun baay'ee garaagarummaa hin fidu.",
  "ins.reg.diverging": "Garaagarummaan naannolee gidduu guddateera. Naannoo sirrii ta'etti gurguruun galii kee kanaan dura caalaa jijjiira.",
  "ins.reg.bigGap": "Garaagarummaan gatii naannolee gidduu baay'ee guddaa dha (%{pct}). Yoo baasiin geejjibaa hayyame, {min} irra {max} keessatti gurguruun baay'ee caalaa siif argamsiisuu danda'a.",
  "ins.reg.close": "Gatiin naannolee hunda keessatti baay'ee walitti dhihaata. Gabaa sitti dhihootti gurguruun filannoo gaarii ta'uu danda'a — fagaachuun bu'aa guddaa hin qabu.",
  "ins.spr.large": "Bittoonni suukii {crop}f waan qonnaan bultoonni argatan caalaa baay'ee kaffalu. Daldaltoonni giddu galeessaa qooda guddaa fudhatu.",
  "ins.spr.medium": "Gatiin suukii {crop} waan qonnaan bultootaaf kaffalamu irra %{pct} gara caala.",
  "ins.spr.small": "Garaagarummaan gatii lafa qonnaa fi gatii suukii {crop} xiqqaa dha. Qonnaan bultoonni qooda isaanii sirrii argachaa jiru.",
  "ins.spr.fact": "{unit} {crop} gurgurame hundaaf, gatiin suukii waan qonnaan bulaan argatu irra {amount} caala. Kun garaagarummaa %{pct} dha. Daldaltoota, geejjibaa fi qabiinsa irratti bahuu dha.",
  "ins.spr.growing": "Garaagarummaan gatii lafa qonnaa fi gatii suukii BAL'ATAA jira. Qoodni qonnaan bultoonni gatii dhumaa irraa argatan xiqqaachaa jira.",
  "ins.spr.shrinking": "Garaagarummaan gatii lafa qonnaa fi gatii suukii DHIPHATAA jira. Qonnaan bultoonni gatii dhumaa irraa qooda caalu argachaa jiru.",
  "ins.spr.same": "Garaagarummaan gatii lafa qonnaa fi gatii suukii baay'ee hin jijjiiramne. Qoodinsa bu'aa irratti jijjiiramni guddaan hin jiru.",
  "ins.spr.veryHigh": "Garaagarummaan lafa qonnaa fi gabaa baay'ee olaanaa dha (%{pct}). Yoo danda'ame daldaltoota naannoof utuu hin taane gabaa magaalaa dhihootti kallattiin gurguruu yaali. Kun galii caalaa siif fiduu danda'a.",
  "ins.spr.fair": "Garaagarummaan gatii lafa qonnaa fi suukii xiqqaa dha. Kun gaarii dha — daldaltoonni galii kee irraa baay'ee hin fudhatan jechuu dha.",
  "ins.time.week1": "torban 1",
  "ins.time.weeks": "torbanoota {n}",
  "ins.time.month1": "gara ji'a 1",
  "ins.time.months2": "gara ji'oota 2",
  "ins.time.months3": "gara ji'oota 3",
  "ins.action.wait": "Gurguruuf eegi",
  "ins.action.hold": "Amma qabadhu",
  "ins.action.sellNow": "Amma gurguri",
  "ins.action.sellSoon": "Dafii gurguri",
  "ins.action.sellUrgently": "Hatattamaan gurguri",
  "ins.fc.up": "Gatiin {crop} {region} keessatti {time} itti aanan keessatti gara %{pct} OL ka'a jedhamee eegama. Eeguun maallaqa caalaa siif argamsiisuu danda'a.",
  "ins.fc.down": "Gatiin {crop} {region} keessatti {time} itti aanan keessatti gara %{pct} GAD bu'a jedhamee eegama. Dafii gurguruun caalaa nageenya qaba.",
  "ins.fc.flat": "Gatiin {crop} {region} keessatti {time} itti aanan keessatti baay'ee hin jijjiiramu jedhamee eegama. Jijjiiramni guddaan hin tilmaamamne.",
  "ins.fc.adviceWait": "Gatiin ol ka'aa jira. Gurguruu dura {time} eeguu yoo dandeesse, gatii har'aa irra gara %{pct} CAALAA argachuu dandeessa. Kan eegdu midhaan kee nageenyaan kuusuu yoo dandeesse qofa.",
  "ins.fc.adviceNow": "Gatiin baay'ee jijjiirama jedhamee hin eegamu. Eeguuf sababni cimaan hin jiru. Amma gurguruun balaa malee gatii har'aa sirrii siif argamsiisa.",
  "ins.fc.adviceSoon": "Gatiin gad bu'aa jira. Hamma turte, galiin kee xiqqaachuu danda'a. Midhaan kee hamma danda'ametti dafii gurguri.",
  "ins.fc.uncertainHigh": "Tilmaamni kun mirkanaa'aa miti. Gatiin waan eegame caalaa ol ykn gad ta'uu danda'a. Karoorri nagaa kutaa amma, kutaa booda gurguruu dha — hunda yeroo tokkotti hin gurgurin.",
  "ins.fc.uncertainMid": "Tilmaama kana keessa shakkiin xiqqoon jira. Kallattiin isaa sirrii ta'uu danda'a, gatiin sirriin garuu adda ta'uu danda'a. Gabaa torban torbaniin hordofi.",
  "ins.fc.reliable": "Tilmaamni kun amanamaa dha. Kallattiin gatii ragaa gabaa cimaa irratti hundaa'a.",
  "ins.fc.dataHigh": "Tilmaamni kun ragaa gabaa torbanoota {n} darbanii fayyadama. Seenaa baay'ee waan ta'eef tilmaamni kun amanamaa dha.",
  "ins.fc.dataMedium": "Tilmaamni kun ragaa torbanoota {n} darban irratti hundaa'a. Qajeelfama gaarii dha garuu guutuu miti.",
  "ins.fc.dataLow": "Midhaan fi naannoo kanaaf ragaa torbanoota {n} qofa qabna. Akka qajeelfama tilmaamaatti itti fayyadamiitii odeeffannoo dabalataaf ogeessa gabaa naannoo kee gaafadhu.",
  "ins.fc.dataVeryLow": "Midhaan kanaaf ragaan darbe baay'ee xiqqaa dha (torbanoota {n}). Tilmaamni kun tilmaama qofa. Murtoo guddaa kennuu dura daldalaa naannoo mari'achiisi.",
  "ins.fc.growMore": "Waqtii itti aanuuf {crop} dabalataa oomishuun yaada gaarii fakkaata. Gatiin ol ka'a jedhamee waan eegamuuf, oomishni kee caalaa siif galcha.",
  "ins.fc.growCareful": "Amma {crop} baay'ee oomishuu irratti of eeggadhu. Yeroo oomishni kee itti aanu ga'utti gatiin gad bu'uu danda'a. Dabalataan facaasuu dura bittoota ykn waldaalee hojii gamtaa mari'achiisi.",
  "ins.fc.growSafe": "Waqtii itti aanuuf {crop} oomishuun filannoo nagaa dha. Gatiin tasgabbaa'aa waan ta'eef galiin kee tilmaamamaa dha.",

  // ── Dashboard ──────────────────────────────────────────────────────────
  "weekday.0": "Dilbata",
  "weekday.1": "Wiixata",
  "weekday.2": "Qibxata",
  "weekday.3": "Roobii",
  "weekday.4": "Kamiisa",
  "weekday.5": "Jimaata",
  "weekday.6": "Sanbata",
  "dash.meta": "Ilaalcha waliigalaa gabaa kee",
  "dash.morning": "Akkam bulte, {name}",
  "dash.afternoon": "Akkam ooltee, {name}",
  "dash.evening": "Galgala gaarii, {name}",
  "dash.setRegion": "Naannoo kee filadhu",
  "dash.loadingPrices": "Gatii torban kanaa fe'aa jira…",
  "dash.noRecentPrices": "{region} keessatti gatiin dhihoo hin jiru",
  "dash.sellingAdvice": "Gorsa gurgurtaa: {crop} {region} keessatti",
  "dash.basedOnForecast": "Tilmaama gatii torban 4 irratti hundaa'e",
  "dash.fullForecast": "Tilmaama guutuu",
  "dash.checkingForecast": "Tilmaama ilaalaa jira…",
  "dash.forecastUnavailable": "Tilmaamni hin jiru",
  "dash.notEnoughData": "Ragaan gahaan hin jiru",
  "dash.cannotForecast": "Gatii {crop} {region} keessatti ammaaf tilmaamuu hin dandeenyu.",
  "dash.todayToForecast": "Har'a {now} → torban 4 keessatti gara {later}",
  "dash.allFarms": "Lafa qonnaa hunda",
  "dash.farmsIn": "Lafa qonnaa {region} keessaa",
  "dash.farmsInYourRegion": "Lafa qonnaa naannoo kee",
  "dash.myFarms": "Lafa qonnaa koo",
  "dash.manage": "Bulchi",
  "dash.noFarmsAll": "Hanga ammaatti qonnaan bulaan lafa qonnaa galmeesse hin jiru.",
  "dash.noFarmsRegion": "{region} keessatti hanga ammaatti qonnaan bulaan lafa qonnaa galmeesse hin jiru.",
  "dash.askRegion": "Naannoo siif akka ramadu bulchaa gaafadhu.",
  "dash.noFarmsYet": "Hanga ammaatti lafti qonnaa hin jiru",
  "dash.addFieldsHint": "Qorannoo fayyaa midhaanii fi filannoo liqii caalu argachuuf lafa qonnaa kee galmeessi.",
  "dash.addFarm": "Lafa qonnaa dabali",
  "dash.noFarmsToShow": "Lafti qonnaa agarsiifamu hin jiru",
  "dash.quickLinks": "Geessituu saffisaa",
  "farm.status.healthy": "Fayyaa qaba",
  "farm.status.warning": "Hordoffii barbaada",
  "farm.status.critical": "Yaaddessaa",
  "price.retail": "qinxaabaa",
  "price.wholesale": "jumlaa",
  "price.producer": "oomishtootaa",
  "price.perUnit": "{unit} tokkoof",
  "unit.ha": "hek",

  // ── Market Intel ───────────────────────────────────────────────────────
  "market.meta": "Gatii midhaanii, walbira qabiinsa naannoo fi tilmaama",
  "market.description": "Gatii midhaanii torbanii gabaawwan Itoophiyaa guutuu irraa. Gatiin akkamitti akka jijjiiramu ilaaluuf midhaan fi naannoo filadhu.",
  "market.view.trend": "Adeemsa gatii",
  "market.view.regional": "Naannolee walbira qabi",
  "market.view.heatmap": "Gabaawwan walbira qabi",
  "market.view.spread": "Gatii lafa qonnaa vs suukii",
  "market.view.forecast": "Tilmaama",
  "market.views": "Ilaalcha gabaa",
  "market.level.retail": "Qinxaabaa (gatii suukii)",
  "market.level.wholesale": "Jumlaa",
  "market.level.producer": "Oomishtootaa (gatii lafa qonnaa)",
  "market.range.3": "Ji'oota 3 darban",
  "market.range.6": "Ji'oota 6 darban",
  "market.range.12": "Ji'oota 12 darban",
  "market.range.24": "Waggoota 2 darban",
  "market.range.all": "Seenaa guutuu",
  "market.range.custom": "Guyyoota mataa kee",
  "confidence.high": "Amanamummaa olaanaa",
  "confidence.medium": "Amanamummaa giddugaleessaa",
  "confidence.low": "Amanamummaa gadi aanaa",
  "confidence.veryLow": "Amanamummaa baay'ee gadi aanaa",
  "market.loadingMeta": "Midhaanii fi gabaawwan fe'aa jira…",
  "market.unavailable": "Ragaan gabaa hin jiru",
  "market.crop": "Midhaan",
  "market.variety": "Gosa",
  "market.allVarieties": "Gosa hunda",
  "market.allRegions": "Naannolee hunda",
  "market.allRegionsLower": "naannolee hunda",
  "market.priceType": "Gosa gatii",
  "market.timePeriod": "Yeroo",
  "market.from": "Irraa",
  "market.to": "Hanga",
  "market.dataAvailable": "Ragaan {crop} {from} irraa hanga {to} jira · galmee gatii {n}",
  "market.latestPrice": "Gatii {level} dhihoo",
  "market.weekOf": "torban {date}",
  "market.changeWeek": "Jijjiirama torban darbe irraa",
  "market.wentUp": "Gatiin ol ka'eera",
  "market.wentDown": "Gatiin gad bu'eera",
  "market.noChange": "Jijjiiramni hin jiru",
  "market.avg4": "Giddugaleessa, torbanoota 4 darban",
  "market.wholePeriod": "yeroo guutuu {price}",
  "market.records": "Galmee gatii yeroo kana keessaa",
  "market.supplySignal": "Mallattoo dhiyeessii: {signal}",
  "market.trend.title": "Gatii {level} {crop} yeroo keessa",
  "market.trend.description": "Giddugaleessa {region}. Kutaan gaaddidduu qabu gatii gabaa gadi aanaa fi olaanaa torban tokkoon tokkoon agarsiisa.",
  "market.loadingPrices": "Gatii fe'aa jira…",
  "market.noPrices": "Gatiin hin argamne",
  "market.noPricesHint": "Naannoo, gosa gatii ykn yeroo dheeraa biraa yaali.",
  "market.marketRange": "Daangaa gabaa",
  "market.averagePrice": "Gatii giddugaleessaa",
  "market.regional.title": "Gatii {crop} naannoon",
  "market.regional.description": "Amma gatiin eessatti olaanaa dha? Sarara tokko tokkoon giddugaleessa gabaawwan naannoo sanaa ti.",
  "market.comparingRegions": "Naannolee walbira qabaa jira…",
  "market.noRegional": "Gatiin naannoo hin argamne",
  "market.noRegionalHint": "Yeroo dheeraa ykn gosa gatii biraa yaali.",
  "market.spread.title": "Waan qonnaan bultoonni argatan vs waan bittoonni kaffalan",
  "market.spread.description": "Garaagarummaan sararoota lamaan gidduu waan daldaltoonni, geejjibni fi qabiinsi fudhatanii dha.",
  "market.loadingSpread": "Gatii lafa qonnaa fi suukii fe'aa jira…",
  "market.noSpread": "Gatiin lafa qonnaa gahaan hin jiru",
  "market.noSpreadHint": "Gatiin oomishtootaa gabaawwan muraasa keessatti qofa sassaabama. Naannoo ykn yeroo dheeraa biraa yaali.",
  "market.coverage": "Filannoo kanaaf gabaawwan %{pct} qofatu gatii lafa qonnaa gabaasa; kanaafuu garaagarummaa akka qajeelfama tilmaamaatti fudhadhu.",
  "market.shopPrice": "Gatii suukii",
  "market.farmPrice": "Gatii lafa qonnaa",
  "market.gap": "Garaagarummaa",
  "market.shopPriceRetail": "Gatii suukii (qinxaabaa)",
  "market.farmPriceProducer": "Gatii lafa qonnaa (oomishtootaa)",
  "market.fc.title": "Tilmaama gatii {crop} — {region}",
  "market.fc.description": "Gatii qinxaabaa torbanoota dhufaniif eegamu. Kutaan gaaddidduu qabu daangaa ta'uu danda'u agarsiisa.",
  "market.fc.region": "Naannoo tilmaamaa",
  "market.fc.weeksAhead": "Torbanoota fuuldura",
  "market.fc.calculating": "Tilmaama herregaa jira…",
  "market.fc.none": "Tilmaamni hin jiru",
  "market.fc.noneHint": "Midhaan fi naannoo kanaaf seenaan gahaan hin jiru.",
  "market.fc.ourAdvice": "Gorsa keenya",
  "market.fc.priceToday": "Gatii har'aa",
  "market.fc.expectedIn": "Torbanoota {n} keessatti kan eegamu",
  "market.fc.likelyRange": "Daangaa ta'uu danda'u",
  "market.fc.expectedPrice": "Gatii eegamu",
  "market.fc.model": "Moodeela: {model}",
  "market.fc.levelPrices": "Gatii {level}",
  "market.fc.shouldSell": "Amma gurguruu qabdaa?",

  // ── Market heatmap ─────────────────────────────────────────────────────
  "insight.title": "Kun siif maal jechuu dha",
  "heat.title": "Gatii {crop} gabaan",
  "heat.titleRegion": "Gatii {crop} gabaan — {region}",
  "heat.description": "Tarreen tokko gabaa tokko, iskuweerri tokko torban tokko dha. Halluun ho'aan gatii olaanaa, halluun qabbanaa'aan gatii gadi aanaa agarsiisa.",
  "heat.sort": "Gabaawwan tartiibeessi",
  "heat.sortPrice": "Gatii olaanaa jalqaba",
  "heat.sortName": "A–Z",
  "heat.chooseRegion": "Naannoo filadhu",
  "heat.chooseRegionHint": "Gabatee kun gabaawwan tokko tokkoon waan walbira qabuuf, yeroo tokkotti naannoo tokko barbaada.",
  "heat.building": "Gabatee gabaa qopheessaa jira…",
  "heat.noPrices": "Gatiin gabaa hin argamne",
  "heat.noPricesHint": "Gosa gatii ykn yeroo dheeraa biraa yaali.",
  "heat.size": "gabaawwan {markets} × torbanoota {weeks}",
  "heat.showingTop": "gabaawwan {n} irra caalaa gabaasan agarsiifamaa jiru ({total} keessaa)",
  "heat.noReport": "Gabaasni hin jiru",
  "heat.aria": "Gabatee gatii gabaa fi torbaniin",
  "heat.noPriceReported": "Gatiin hin gabaafamne",
  "heat.whereToSell": "Eessatti gurguruu",
  "heat.ins.recent": "Torbanoota {weeks} darban keessatti {top} gara {topPrice} kaffaleera. {bottom} gara {bottomPrice} kaffaleera.",
  "heat.ins.difference": "Kun gabaawwan naannoo tokko keessaa gidduutti garaagarummaa {unit} tokkoof {diff} (%{pct}) dha.",
  "heat.ins.bigGap": "Gabaawwan walitti dhihoo gidduutti gatiin baay'ee garaa garaa dha. Gabaa gatii olaanaa qabu bira ga'uu yoo dandeesse, baasii geejjibaa booda illee imalli bu'aa qabaachuu danda'a.",
  "heat.ins.similar": "Gabaawwan naannoo kanaa gatii walfakkaataa kaffalu. Gabaa sitti dhihootti gurguruun yeroo baay'ee filannoo gaarii dha.",
  "heat.ins.others": "Gabaawwan amma gatii olaanaa kaffalan biroo: {markets}.",
  "heat.ins.headline": "Amma {crop}f {region} keessatti kan caalaa kaffalu {market} dha.",
  "area.chooseRegion": "Naannoo filadhu",

  // ── AI advisor ─────────────────────────────────────────────────────────
  "advisor.meta": "Deebii qajeelfama Ministeera Qonnaa irraa",
  "advisor.description": "Afaan Amaaraatiin, Afaan Oromootiin, Afaan Tigiraayitiin ykn Afaan Ingiliiziitiin gaafadhu. Deebiin qajeelfama Ministeera Qonnaa fi ragaa lafa qonnaa kee irraa madda isaa wajjin dhufa.",
  "advisor.title": "Gorsaa qonnaa",
  "advisor.subtitle": "Qajeelfama qamadii MoA · haala qilleensaa · gatii gabaa",
  "advisor.panelSubtitle": "Qajeelfama MoA · haala qilleensaa · gatii — አማርኛ, Afaan Oromoo, ትግርኛ, English",
  "advisor.newChat": "Haasaa haaraa",
  "advisor.emptyTitle": "Gorsaa qonnaa kee gaafadhu",
  "advisor.emptyBody": "Deebiin hundi eessaa akka dhufe agarsiisa. Yoo qajeelfamni gaaffii kee hin uwwisne, tilmaamuu irra Hojjetaa Misoomaa keetti ergama.",
  "advisor.tryAsking": "Kana gaafadhu",
  "advisor.tapToSend": "Ergachuuf gaaffii tuqi.",
  "advisor.howItWorks": "Gorsaan akkamitti hojjeta",
  "advisor.how1": "Deebiin fuula qajeelfamaa kam irraa akka dhufe ilaaluuf mallattoo madda akka S1 tuqi.",
  "advisor.how2": "Hamma farra ilbiisotaa gonkumaa hin himu. Biifuuf karoora yaalaa Fayyaa Midhaanii irraa fayyadami ykn Hojjetaa Misoomaa kee gaafadhu.",
  "advisor.how3": "Gatii fi tilmaamni qajeelfama malee waadaa miti.",
  "advisor.how4": "Summaa'uu yoo jiraate, bilbila balaa tasaa mul'atu battaluma bilbili.",
  "advisor.auto": "Ofumaan",
  "advisor.answerLanguage": "Afaan deebii",
  "advisor.sourceRef": "Madda {ref}",
  "advisor.openSource": "Galmee madda bani",
  "advisor.kind.poisoning": "Summaa'uu ta'uu danda'a — amma gargaarsa argadhu.",
  "advisor.kind.refusal": "Oomishni kun hayyama hin qabu.",
  "advisor.kind.dontKnow": "Qajeelfamaan hin uwwifamne.",
  "advisor.kind.person": "Nama waliin si quunnamsiisaa jira.",
  "advisor.kind.unavailable": "Gorsaan amma hin argamu.",
  "advisor.escalated": "Gaaffiin kee Hojjetaa Misoomaa keetti ergameera.",
  "advisor.hideSources": "Madda dhoksi",
  "advisor.source": "madda {n}",
  "advisor.sources": "madda {n}",
  "advisor.thanks": "Yaada keetiif galatoomi",
  "advisor.helpful?": "Kun si fayyadeeraa?",
  "advisor.helpful": "Ni fayyada",
  "advisor.notHelpful": "Hin fayyadu",
  "advisor.unreachable": "Gorsaa argachuun hin danda'amne. Walqunnamtii kee mirkaneessiitii irra deebi'ii yaali.",
  "advisor.open": "Gorsaa qonnaa bani",
  "advisor.close": "Gorsaa qonnaa cufi",
  "advisor.chat": "Haasaa gorsaa qonnaa",
  "advisor.openFull": "Fuula Gorsa AI guutuu bani",
  "advisor.panelWelcome": "Waa'ee midhaan kee, xaa'oo, bishaan obaasuu, dhukkuba ykn gatii gabaa gaafadhu — Afaan Amaaraa, Afaan Oromoo, Afaan Tigiraay ykn Afaan Ingiliiziitiin. Deebiin hundi madda isaa agarsiisa.",
  "advisor.typeQuestion": "Gaaffii kee barreessi…",
  "advisor.typing": "Gorsaan barreessaa jira",
  "advisor.message": "Ergaa",
  "advisor.send": "Ergaa ergi",
  "alerts.label": "Akeekkachiisa",
  "alerts.checkWithPhoto": "Lafa qonnaa koo suuraan qoradhu",
  "alerts.dismiss": "Akeekkachiisa cufi",
  "area.chooseZone": "Godina filadhu",
  "area.chooseWoreda": "Aanaa filadhu",
  "area.regionFirst": "Jalqaba naannoo filadhu",
  "area.zoneFirst": "Jalqaba godina filadhu",
  "area.loadFailed": "Tarree bakkeewwanii fe'uun hin danda'amne. Walqunnamtii kee mirkaneessi.",

  // ── Crop health ────────────────────────────────────────────────────────
  "demo.title": "Odeeffannoo agarsiisaa: osoo hin fayyadamin dura mirkaneessaa",  // draft – needs native review
  "demo.message": "{subject} asitti mul'atan agarsiisaa qofa. Osoo hin bitin ykn hin biifin dura moxxaa oomishaa fi galmee EAA ammaa waliin mirkaneessaa, DA keessan waliinis mari'adhaa.",  // draft – needs native review
  "demo.subject.products": "Maqaa oomishaa fi hamma",
  "demo.subject.suppliers": "Dhiyeessitoota, oomishaa fi gatii",
  "demo.subject.textDiagnosis": "Qorannoo barreeffamaan, maqaa oomishaa fi hamma",
  "demo.message.loans": "Liqeessitoonni, gosoonni liqii fi dhalli asitti mul'atan agarsiisaa qofa. Osoo hin iyyatin dura haalawwan baankii ykn dhaabbata maaykiroofaayinaansii waliin mirkaneessaa.",  // draft – needs native review
  "photo.outOfStock": "kuusaa keessa hin jiru",  // draft – needs native review
  "photo.sources": "Maddoota: {list}",  // draft – needs native review
  "unit.km": "km",  // draft – needs native review
  "unit.lPerHa": "L/ha",  // draft – needs native review
  "severity.low": "Gadi aanaa",
  "severity.moderate": "Giddugaleessaa",
  "severity.high": "Olaanaa",
  "severity.critical": "Yaaddessaa",
  "crop.meta": "Midhaan kee dhukkubaaf qoradhu",
  "crop.description": "Suuraa baala dhukkubsatee kaasi. Moodeelli AI suuraa sana olka'iinsa fi haala qilleensaa lafa qonnaa kee wajjin fayyadamee karoora yaalaa kenna.",
  "crop.example1": "Baala irratti sararoota keelloo jalaa biqiltuu irraa jalqaban",
  "crop.example2": "Baala irratti tuqaalee magaalaa geengoo keelloo qaban",
  "crop.example3": "Biqiltoonni kufaa jiru, ulmi isaaniis laafaa fakkaata",
  "crop.describeMore": "Maaloo waan argitu xiqqoo bal'isii ibsi (yoo xiqqaate hima gabaabaa).",
  "crop.loadingFarms": "Lafa qonnaa kee fe'aa jira…",
  "crop.addFarmFirst": "Jalqaba lafa qonnaa galmeessi",
  "crop.noFarms": "Hanga ammaatti lafti qonnaa qoratamu hin jiru",
  "crop.addFarmHint": "Qorannoon fayyaa midhaanii lafa qonnaa kee tokko wajjin waan walqabatuuf yeroo keessa hordofuu dandeenya.",
  "crop.noFarmsRegion": "{region} keessatti hanga ammaatti qonnaan bulaan lafa qonnaa galmeesse hin jiru. Yeroo galmeessan asitti mul'atu.",
  "crop.noRegion": "Naannoon siif hin ramadamne. Naannoo siif akka ramadu bulchaa gaafadhu.",
  "crop.goToProfile": "Gara Ibsa Kootti deemi",
  "crop.checkField": "Lafa qonnaa qoradhu",
  "crop.mode.photo": "Suuraan qorachuu",
  "crop.mode.describe": "Ibsi (beetaa)",  // draft – needs native review
  "crop.whichField": "Lafa qonnaa kami?",
  "crop.whatDoYouSee": "Maal argita?",
  "crop.describePlaceholder": "Baala, ulmii ykn firii ibsi: halluu, tuqaalee, eessaa akka jalqabe, hammam lafa qonnaa…",
  "crop.checkMyCrop": "Midhaan koo qoradhu",
  "crop.history": "Seenaa fayyaa",
  "crop.historyHint": "Qorannoo lafa qonnaa keetiif olkaa'aman",
  "crop.noHistory": "Hanga ammaatti qorannoon olkaa'ame hin jiru",
  "crop.noHistoryHint": "Rakkoo lafa qonnaa kee hordofuuf qorannoo olkaa'i.",
  "crop.causedBy": "Kan fide {pathogen}",
  "crop.risk": "Balaa {level}",
  "crop.match": "%{pct} walsima",
  "crop.signs": "Mallattoolee ilaalamuu qaban",
  "crop.whatToDoDemo": "Maal gochuu qabdu (beetaa)",  // draft – needs native review
  "crop.checkAgain": "Lafa qonnaa {date} irra deebi'ii qoradhu.",
  "crop.guideOnly": "Kun qajeelfama qofa — rakkoo cimaaf hojjetaa misoomaa kee bilbili.",
  "crop.saved": "Seenaa keessatti olkaa'ameera",
  "crop.saveToHistory": "Seenaa keessatti olkaa'i",
  "crop.resolved": "Furameera",
  "crop.markSolved": "Akka furameetti mallatteessi",

  // ── Photo diagnosis ────────────────────────────────────────────────────
  "photo.cond.altitude": "Olka'iinsa",
  "photo.cond.temperature": "Ho'a (torban darbe)",
  "photo.cond.humidity": "Jiidhina (torban darbe)",
  "photo.cond.rain": "Rooba (torban darbe)",
  "photo.needPhoto": "Jalqaba suuraa baala dhukkubsatee kaasi ykn filadhu.",
  "photo.selectedLeaf": "Baala filatame",
  "photo.take": "Suuraa baala dhukkubsatee kaasi",
  "photo.tips": "Dhihoo, ifa guyyaa keessatti, baalli tokko suuraa irra caalaa akka guutu",
  "photo.different": "Suuraa biraa fayyadami",
  "photo.showIn": "Bu'aa afaan kanaan agarsiisi",
  "photo.check": "Suuraa qoradhu",
  "photo.whyConditions": "Waagii fi septooriyaan haala qilleensaa irratti waan hundaa'aniif, olka'iinsa lafa qonnaa kee fi haala qilleensaa torban darbees ni fayyadamna.",
  "photo.howDecided": "Moodeelli akkamitti murteesse",
  "photo.photoOnly": "Suuraa qofa",
  "photo.photoOnlyHint": "Suuraan baalaa qofti waan agarsiisu",
  "photo.withConditions": "Suuraa + haala lafa qonnaa",
  "photo.withConditionsHint": "Olka'iinsa, ho'a, jiidhina fi rooba dabala",
  "photo.conditionsNotUsed": "Hin fayyadamne: haalli lafa qonnaa hin argamne ykn daangaa moodeelli irratti leenji'e ala ture.",
  "photo.outOfRange": "{value} — moodeelli kan leenji'e {min}–{max} irratti.",
  "photo.p.dosePerHa": "Hamma hektaara tokkoof",
  "photo.p.perKnapsack": "Biifaa dugdaa tokkoof",
  "photo.p.water": "Bishaan",
  "photo.p.maxSprays": "Lakkoofsa biifinsa olaanaa",
  "photo.p.interval": "Guyyoota biifinsa gidduu",
  "photo.p.phi": "Guyyoota haamaa dura",
  "photo.p.reentry": "Lafa qonnaa irraa fagaadhu",
  "photo.p.rainFree": "Yeroo roobaa malee biifinsa booda",
  "photo.hours": "sa'aatii {n}",
  "photo.reg": "Galmee {n}",
  "photo.verified": "Mirkanaa'e",
  "photo.placeholder": "Galmee EAA mirkaneessi",  // draft – needs native review
  "photo.ppe": "Uffata eegumsaa: {items}",
  "photo.sponsored": "Deeggarsaan",
  "photo.notChecked": "Hanga ammaatti ogeessaan hin mirkanoofne",
  "photo.notCheckedBody": "Hammi hanga galmee EAA waliin mirkanaa'utti hin mul'atu. Moxxaa oomishaa hordofaa; osoo hin bitin ykn hin biifin dura DA keessan waliin mirkaneessaa.",  // draft – needs native review
  "photo.inField": "Lafa qonnaa irratti maal gochuu qabda",
  "photo.ifSpray": "Biifuu yoo barbaachise",
  "photo.approvedAI": "Qabiyyeewwan hojii hayyamaman: {list}. Oomisha galmaa'e argachuuf Hojjetaa Misoomaa kee gaafadhu.",
  "photo.weather": "Haala qilleensaa",
  "photo.whereToBuy": "Eessaa bituu (kan dhihoo jalqaba)",
  "photo.kind.disease": "Dhukkubni argameera",
  "photo.kind.healthy": "Fayyaa qaba fakkaata",
  "photo.kind.uncertain": "Hin mirkanoofne — dhihoo ilaalamuu qaba",
  "photo.kind.invalid": "Maaloo suuraa haaraa kaasi",
  "photo.thankYou": "Galatoomi.",
  "photo.daVisit": "Hojjetaan Misoomaa kee akka si daawwatu gaafatameera.",
  "photo.outcome.better": "Fooyya'eera",
  "photo.outcome.same": "Akkuma jiru",
  "photo.outcome.worse": "Hammaateera",
  "photo.howNow": "Lafti qonnaa amma akkam jira?",
  "photo.sure": "{pct} mirkanaa'aa",
  "photo.daCheck": "Hojjetaan Misoomaa kee lafa qonnaa kana akka qoru gaafatameera.",
  "photo.untilThen": "Hanga sanatti",
  "photo.askAgain": "{date} irra deebinee si gaafanna.",
  "model.brown_rust": "Waagii magaalaa",
  "model.healthy": "Fayyaa qaba",
  "model.invalid": "Baala qamadii miti",
  "model.powdery_mildew": "Daakuu adii",
  "model.septoria": "Septooriyaa",
  "model.yellow_rust": "Waagii keelloo",
  "ppe.boots": "kophee kooboo",
  "ppe.gloves": "guwaantii",
  "ppe.goggles": "eegumsa ijaa",
  "ppe.long_sleeves": "uffata harka dheeraa",
  "ppe.mask": "maaskii",
  "ppe.coverall": "tuutaa guutuu",
  "ppe.respirator": "eegumsa hargansuu",

  // ── Input suppliers ────────────────────────────────────────────────────
  "inputs.meta": "Dhiyeessitoota sanyii, xaa'oo fi keemikaalaa argadhu",
  "inputs.description": "Sanyii, xaa'oo fi keemikaala midhaanii sitti dhihoo argadhu. Walbira qabuuf dhiyeessitoota lama ykn isaa ol filadhu.",
  "inputs.myRegion": "Naannoo koo ({region})",
  "inputs.productType": "Gosa oomishaa",
  "inputs.allProducts": "Oomisha hunda",
  "inputs.searchPlaceholder": "Dhiyeessaa, oomisha ykn mallattoo daldalaa",
  "inputs.compare1": "Dhiyeessaa {n} walbira qabi",
  "inputs.compareN": "Dhiyeessitoota {n} walbira qabi",
  "inputs.tickMore": "Walbira qabuuf yoo xiqqaate dhiyeessaa tokko dabalii filadhu.",
  "inputs.tellNeed": "Deebii caalu argachuuf waan barbaaddu nutti himi (filannoo).",
  "inputs.clear": "Qulqulleessi",
  "inputs.whatNeed": "Maal barbaadda?",
  "inputs.needPlaceholder": "fkn. xaa'oo DAP xaafii hektaara 2f",
  "inputs.compare": "Walbira qabi",
  "inputs.finding": "Dhiyeessitoota barbaadaa jira…",
  "inputs.none": "Dhiyeessaan hin argamne",
  "inputs.noneHint": "Naannoo ykn gosa oomishaa biraa yaali, ykn barbaacha qulqulleessi.",
  "inputs.kmAway": "km {n} fagaata",
  "inputs.stock": "Kuusaa: {stock}",
  "inputs.showAll": "Oomisha {n} hunda agarsiisi",

  // ── Financial ──────────────────────────────────────────────────────────
  "fin.meta": "Qabxii liqii kee fi filannoo liqii",
  "fin.description": "Qabxii liqii lafa qonnaa kee fi liqii iyyachuu dandeessu ilaali. Qabxiin odeeffannoo ibsa kee keessa jiru qofa fayyadama.",
  "fin.band.strong": "Cimaa",
  "fin.band.good": "Gaarii",
  "fin.band.fair": "Giddugaleessaa",
  "fin.band.needsWork": "Fooyya'iinsa barbaada",
  "fin.tip.farms": "Lafa qonnaa kee Ibsa Koo keessatti galmeessi (+qabxii 10).",
  "fin.tip.region": "Naannoo kee Ibsa Koo keessatti filadhu (+qabxii 5).",
  "fin.tip.zone": "Godina kee Ibsa Koo keessatti dabali (+qabxii 3).",
  "fin.tip.size": "Bal'ina lafa qonnaa tokkoon tokkoon (hektaaraan) galchi (+qabxii 3 hanga +7).",
  "fin.tip.resolve": "Hir'isa haquuf rakkoo midhaanii yaaliitii gabaasa fayyaa akka furameetti mallatteessi.",
  "fin.tip.track": "Seenaa ijaaruuf qorannoo Fayyaa Midhaanii fayyadamiitii hordofi (+qabxii 5).",
  "fin.yourScore": "Qabxii liqii kee",
  "fin.calculating": "Qabxii kee herregaa jira…",
  "fin.whatAffects": "Wantoota qabxii kee tuqan",
  "fin.helping": "Kan si gargaaran",
  "fin.holdingBack": "Kan duubatti si harkisan",
  "fin.loans": "Liqii iyyachuu dandeessu",
  "fin.loansHint": "Dhala gadi aanaa irraa jalqabee tartiibaa'e. Kaffaltiin ji'aa hamma guutuuf.",
  "fin.findingLoans": "Filannoo liqii barbaadaa jira…",
  "fin.noLoans": "Hanga ammaatti liqiin walsimu hin jiru",
  "fin.noLoansHint": "Filannoo liqii dabalataa argachuuf qabxii kee fooyyessi.",
  "fin.notYet": "Ammaaf siif hin jiru",
  "fin.scoreAria": "Qabxii liqii {score} 100 keessaa",
  "fin.outOf100": "100 keessaa",
  "fin.raise": "Qabxii kee akkamitti olkaasta",
  "fin.updateProfile": "Ibsa koo haaromsi",
  "fin.nothingYet": "Hanga ammaatti homaa hin jiru.",
  "fin.nothingWellDone": "Homaa hin jiru — baay'ee gaarii.",
  "fin.notForRole": "Gosa herrega keetiif hin dhiyaatu",
  "fin.needsPoints": "Qabxii dabalataa {n} barbaada",
  "fin.upTo": "Hanga",
  "fin.interest": "Dhala",
  "fin.perYear": "%{rate} waggaatti",
  "fin.months": "ji'oota {n}",
  "fin.monthly": "Ji'aan",
  "fin.factor.farm_records": "Galmee lafa qonnaa",
  "fin.factor.farm_records.detail": "lafti qonnaa {value} galmaa'eera",
  "fin.factor.region": "Galmee naannoo",
  "fin.factor.region.detail": "{value} keessatti galmaa'e",
  "fin.factor.zone": "Galmee godinaa",
  "fin.factor.zone.detail": "Godina: {value}",
  "fin.factor.critical_reports": "Gabaasa dhukkubaa yaaddessaa hin furamne",
  "fin.factor.critical_reports.detail": "gabaasni fayyaa yaaddessaan {value} banaa dha",
  "fin.factor.moderate_reports": "Akeekkachiisa dhukkubaa hojii irra jiru",
  "fin.factor.moderate_reports.detail": "gabaasni giddugaleessaa {value} hordoffii eega",
  "fin.factor.track_record": "Seenaa hojii",
  "fin.factor.track_record.detail": "gabaasni fayyaa furame {value}",
  "fin.factor.farm_scale": "Bal'ina lafa qonnaa",
  "fin.factor.farm_scale.detail": "lafa qonnaa galmaa'e hektaara {value}",
  "fin.factor.smallholder": "Lafa qonnaa xiqqaa",
  "fin.factor.smallholder.detail": "hektaarri {value} galmaa'eera",

  // ── My profile ─────────────────────────────────────────────────────────
  "profile.meta": "Herrega kee fi lafa qonnaa kee",
  "profile.description": "Gatii fi gorsi naannoo kee wajjin akka walsimuuf odeeffannoo kee haaromsi.",
  "profile.nameEmpty": "Maqaan duwwaa ta'uu hin danda'u.",
  "profile.saved": "Ibsi kee olkaa'ameera.",
  "profile.personal": "Odeeffannoo dhuunfaa",
  "profile.phoneHint": "Lakkoofsi bilbilaa kee seensa kee waan ta'eef jijjiiramuu hin danda'u.",
  "profile.regionLocked": "Qonnaan bultoota naannoo kana keessaa deeggarta. Jijjiiruuf bulchaa gaafadhu.",
  "profile.legacyAddress": "Teessoo olkaa'ame: {address}. Haalli qilleensaa fi akeekkachiisni iddoo sirrii akka fayyadamaniif tarree irraa filadhu.",
  "profile.farmsHint": "Lafa itti qonattu. Qorannoo fayyaa midhaanii fi qabxii liqii keetiif fayyada.",
  "profile.addFarm": "Lafa qonnaa dabali",
  "profile.firstField": "Jalqabuuf lafa qonnaa kee isa jalqabaa galmeessi.",
  "profile.area": "Bal'ina",
  "profile.planted": "Kan facaafame",
  "profile.deleteTitle": "Lafti qonnaa kun haa haqamuu?",
  "profile.deleteMessage": "\"{name}\" fi odeeffannoon isaa ni haqama. Kana deebisuun hin danda'amu.",
  "profile.fieldRequired": "Maqaa lafa qonnaa fi midhaan barbaachisa.",
  "profile.areaPositive": "Bal'inni lakkoofsa hektaaraa zeeroo ol ta'uu qaba.",
  "profile.editFarm": "Lafa qonnaa gulaali",
  "profile.oneField": "Waa'ee lafa qonnaa tokko itti qonattu nutti himi.",
  "profile.fieldName": "Maqaa lafa qonnaa",
  "profile.fieldNamePlaceholder": "fkn. Lafa kaabaa",
  "profile.cropPlaceholder": "fkn. Xaafii",
  "profile.areaHa": "Bal'ina (hektaara)",
  "profile.plantingDate": "Guyyaa facaasaa",
  "profile.condition": "Haala",
  "profile.notes": "Yaadannoo",
  "profile.notesPlaceholder": "Waa'ee lafa qonnaa kanaa waan yaadachuu qabdu",

  // ── Users (admin) ──────────────────────────────────────────────────────
  "users.meta": "Fayyadamtoota waltajjii bulchi",
  "users.description": "Namoota herrega Agri-Stack 360 qaban hunda. Fayyadamaa gulaaluuf ykn jecha icciitii isaa jijjiiruuf Gochaalee fayyadami.",
  "users.total": "Fayyadamtoota waliigalaa",
  "users.farms": "Lafa qonnaa galmaa'e",
  "users.openReports": "Gabaasa fayyaa banaa",
  "users.resolvedReports": "Gabaasa fayyaa furame",
  "users.all": "Fayyadamtoota hunda",
  "users.search": "Maqaa, bilbila ykn naannoo barbaadi",
  "users.filterRole": "Gaheen calleessi",
  "users.allRoles": "Gahee hunda",
  "users.noMatch": "Fayyadamaan walsimu hin jiru",
  "users.noMatchHint": "Barbaacha ykn calaltuu gahee qulqulleessi.",
  "users.farmsCol": "Lafa qonnaa",
  "users.joined": "Kan makame",
  "users.agentRegionHint": "Hojjettoonni misoomaa lafa qonnaa naannoo isaanii qofa argu",
  "users.regionFor": "Naannoo {name}",
  "users.noRegion": "Naannoo hin qabu",
  "users.savedNotice": "Odeeffannoon {name} olkaa'ameera.",
  "users.passwordNotice": "Jechi icciitii haaraan {name}f qophaa'eera. Qaamaan ykn bilbilaan kenniif.",
  "users.reactivateQ": "{name} irra deebi'ee haa hojjetu?",
  "users.deactivateQ": "{name} haa dhaabbatu?",
  "users.deactivateBody": "Herrega irraa ba'u; hanga herregni deebi'ee banamutti seenuu hin danda'an.",
  "users.reactivateBody": "Irra deebi'anii seenuu danda'u.",
  "users.deactivate": "Dhaabi",
  "users.reactivate": "Irra deebi'ii hojjechiisi",
  "users.actionsFor": "Gochaalee {name}",
  "users.editUser": "Fayyadamaa gulaali",
  "users.resetPassword": "Jecha icciitii jijjiiri",
  "users.agentNeedsRegion": "Hojjettoonni misoomaa naannoo barbaadu — lafa qonnaa naannoo isaanii qofa argu.",
  "users.joinedOn": "kan makame {date}",
  "users.lastSignIn": "yeroo dhumaa kan seene {date}",
  "users.neverSignedIn": "hanga ammaatti hin seenne",
  "users.phoneHint": "Lakkoofsi bilbilaa seensa isaanii waan ta'eef jijjiiramuu hin danda'u.",
  "users.ownRole": "Gahee kee jijjiiruu hin dandeessu.",
  "users.legacyAddress": "Teessoo olkaa'ame: {address}. Koodii bakkaa seeraa olkaa'uuf tarree irraa filadhu.",
  "users.accountActive": "Herregni hojii irra jira",
  "users.accountOff": "Herregni dhaabbateera",
  "users.changingRole": "Gahee gara {role}tti jijjiiruu",
  "users.takesEffect": "Jijjiiramni akkuma olkaa'attetti hojii irra oola.",
  "users.gains": "Kan argatu: {list}.",
  "users.loses": "Kan dhabu: {list}.",
  "users.deactivateWarn": "Olkaa'uun herrega irraa isaan baasa. Hanga herregni deebi'ee banamutti seenuu hin danda'an.",
  "users.setNewFor": "{name} ({phone})f jecha icciitii haaraa qopheessi.",
  "users.newPassword": "Jecha icciitii haaraa",
  "users.generate": "Ofumaan uumi",
  "users.giveInPerson": "Jecha icciitii haaraa qaamaan ykn bilbilaan kenniif. Jechi icciitii isaanii duraanii battaluma hojii dhaaba.",
  "users.setPassword": "Jecha icciitii haaraa olkaa'i",

  // ── Permissions and role descriptions ──────────────────────────────────
  "permArea.market": "Gabaa fi gorsa",
  "permArea.farms": "Lafa qonnaa fi fayyaa midhaanii",
  "permArea.inputs": "Galtee fi faayinaansii",
  "perm.market_read": "Gatii gabaa fi tilmaama ilaaluu",
  "perm.market_read.desc": "Gatii torbanii, walbira qabiinsa naannoo, gabatee gabaa fi tilmaama gatii.",
  "perm.advisory_use": "Gorsaa AI fayyadamuu",
  "perm.advisory_use.desc": "Waa'ee gatii, gurgurtaa fi qonnaa gorsaa AI gaafachuu.",
  "perm.profile_manage": "Ibsa ofii gulaaluu",
  "perm.profile_manage.desc": "Maqaa, godina, aanaa fi afaan ofii jijjiiruu.",
  "perm.farms_manage_own": "Lafa qonnaa ofii galmeessuu fi gulaaluu",
  "perm.farms_manage_own.desc": "Lafa qonnaa ofii uumuu, gulaaluu fi haquu.",
  "perm.farms_read_region": "Lafa qonnaa naannoo ofii ilaaluu",
  "perm.farms_read_region.desc": "Lafa qonnaa abbaan isaa naannoo tokko keessa jiru hunda ilaaluu. Naannoon isaanii bulchaan ramadama.",
  "perm.farms_manage_all": "Lafa qonnaa hunda ilaaluu fi gulaaluu",
  "perm.farms_manage_all.desc": "Lafa qonnaa waltajjii irra jiru kamiyyuu ilaaluu fi jijjiiruu.",
  "perm.crop_health_use": "Qorannoo fayyaa midhaanii gaggeessuu",
  "perm.crop_health_use.desc": "Lafa qonnaa argan irratti rakkoo qoruu, gabaasa fayyaa olkaa'uu fi akka furameetti mallatteessuu.",
  "perm.inputs_read": "Dhiyeessitoota galtee ilaaluu",
  "perm.inputs_read.desc": "Dhiyeessitoota sanyii, xaa'oo fi keemikaalaa argachuu fi AI'n walbira qabuu.",
  "perm.financial_read": "Qabxii liqii fi liqii ilaaluu",
  "perm.financial_read.desc": "Qabxii liqii lafa qonnaa isaanii fi oomisha liqii walsimu ilaaluu.",
  "perm.users_manage": "Fayyadamtootaa fi gahee bulchuu",
  "perm.users_manage.desc": "Fayyadamtoota tarreessuu, gahee fi naannoo jijjiiruu, herrega banuu ykn dhaabuu.",
  "perm.platform_stats": "Istaatiksii waltajjii ilaaluu",
  "perm.platform_stats.desc": "Waliigala fayyadamtootaa, lafa qonnaa fi gabaasa fayyaa ilaaluu.",
  "perm.sync_manage": "Walsimsiisa ragaa gaggeessuu",
  "perm.sync_manage.desc": "Gatii haaraa nmis.et irraa buusuu, sagantaa guyyaa qopheessuu fi seenaa walsimsiisaa ilaaluu.",
  "perm.models_retrain": "Moodeela tilmaamaa irra deebi'ii leenjisuu",
  "perm.models_retrain.desc": "Moodeela tilmaama gatii irra deebi'ii leenjisuu jalqabuu.",
  "perm.knowledge_manage": "Kuusaa beekumsa gorsaa bulchuu",
  "perm.knowledge_manage.desc": "Galmee qajeelfamaa gorsaan AI irraa deebisu fe'uu, ramaduu, kuusaa keessa galchuu fi irra deebi'ii agarsiisuu.",
  "perm.advisory_admin": "Gorsa AI bulchuu",
  "perm.advisory_admin.desc": "Daangaa gorsaa jijjiiruu, sirna akeekkachiisaa gaggeessuu fi dhimmoota dabarfaman ilaaluu.",
  "role.farmer.desc": "Midhaan oomisha. Lafa qonnaa ofii bulcha, fayyaa midhaanii qora, dhiyeessitoota galtee walbira qaba, filannoo liqii ilaala.",
  "role.agent.desc": "Qonnaan bultoota naannoo ofii deeggara: lafa qonnaa isaanii ilaala, qorannoo fayyaa midhaanii isaaniif gaggeessa.",
  "role.trader.desc": "Oomisha bita gurgura. Gatii gabaa hordofa, dhiyeessitoota galtee walbira qaba, filannoo liqii ilaala.",
  "role.admin.desc": "Waltajjii bulcha. Fayyadamtoota, gahee fi walsimsiisa ragaa bulchuu dabalatee hayyama hunda qaba.",

  // ── Roles and permissions pages ────────────────────────────────────────
  "roles.meta": "Gaheen tokko tokkoon maaliif akka ta'ee fi maal gochuu akka danda'u",
  "roles.description": "Herregni hundi gahee tokko qaba. Gaheen fuula namni tokko argu fi waan akka godhu hayyamameef murteessa.",
  "roles.loading": "Gahee fe'aa jira…",
  "roles.howGiven": "Gaheen akkamitti kennama",
  "roles.howGivenBody": "Qonnaan bultootaa fi daldaltoonni yeroo galmaa'an gahee isaanii filatu. Hojjettoonni misoomaa fi bulchitoonni ragaa namoota biroo arguu waan danda'aniif, gahee kana kennuu kan danda'u bulchaa qofa dha; fuula Fayyadamtootaa irratti.",
  "roles.openUsers": "Fayyadamtoota bani",
  "roles.openSignup": "Galmee banaa",
  "roles.byAdmin": "Bulchaan kan kennamu",
  "roles.people": "Namoota gahee kana qaban",
  "roles.activeCount": "{n} hojii irra",
  "roles.areas": "kutaa {n}",
  "roles.viewUsers": "Fayyadamtoota ilaali: {role}",
  "roles.compareAll": "Hayyama hunda walbira qabi",
  "perms.meta": "Hayyama hundaa fi gahee isaan qaban",
  "perms.description": "Waan namni tokko akka godhu hayyamamuu danda'u hunda fi gahee isaan hayyaman. Sarvarri gaaffii hunda irratti kana mirkaneessa.",
  "perms.search": "Hayyama barbaadi",
  "perms.loading": "Hayyama fe'aa jira…",
  "perms.noMatch": "Hayyamni walsimu hin jiru",
  "perms.noMatchHint": "Jecha biraa yaali.",
  "perms.footer": "Waan namni tokko gochuu danda'u jijjiiruuf, fuula Fayyadamtootaa irratti gahee isaa jijjiiri. Hayyamni kan ibsame keessatti:",
  "perms.count1": "hayyama {n}",
  "perms.countN": "hayyama {n}",
  "perms.permission": "Hayyama",
  "perms.allowed": "{role}: hayyamameera",
  "perms.notAllowed": "{role}: hin hayyamamne",

  // ── Knowledge base (admin) ─────────────────────────────────────────────
  "kb.meta": "Galmee qajeelfamaa gorsaan irraa deebisu",
  "kb.description": "Qajeelfama Ministeera Qonnaa gorsaan AI irraa deebisu. Galmeen kuusaa keessa galan siʼa kana booda hin fayyadaman.",
  "kb.detect": "Ofumaan adda baasi",
  "kb.mixed": "Makaa",
  "kb.embeddedPartial": "Kutaan {n} agarsiifameera; {left} ammayyuu eegaa jira.",
  "kb.embedded": "Kutaan {n} agarsiifameera.",
  "kb.allEmbedded": "Kutaan hundi duraanuu agarsiifameera.",
  "kb.reindex": "Irra deebi'ii agarsiisi",
  "kb.uploadPdf": "PDF fe'i",
  "kb.activeDocs": "Galmee hojii irra jiru",
  "kb.passages": "Kutaalee",
  "kb.readyMeaning": "Barbaacha hiikaaf qophaa'e",
  "kb.documents": "Galmeewwan",
  "kb.noDocs": "Hanga ammaatti galmeen hin jiru",
  "kb.noDocsHint": "Paakeejii oomishaa fi qajeelfama MoA PDFn fe'i.",
  "kb.title": "Mata duree",
  "kb.crops": "Midhaanii",
  "kb.pages": "Fuulota",
  "kb.added": "Kan dabalame",
  "kb.embeddedOf": "{n}/{total} agarsiifameera",
  "kb.inUse": "Hojii irra",
  "kb.archived": "Kuusaa keessa",
  "kb.archive": "Kuusaa keessa galchi",
  "kb.restore": "Deebisi",
  "kb.addedNotice": "\"{title}\" dabalameera: fuula {pages}, kutaa {chunks}.",
  "kb.ocrSkipped": "Fuulonni {pages} barreeffama hin qaban (iskaanii dha) kanaaf darbameera.",
  "kb.test": "Gaaffii yaali",
  "kb.testHint": "Gorsaan deebisuu dura kutaalee kam akka dubbisu ilaali.",
  "kb.testPlaceholder": "fkn. ዩሪያ መቼ ይጨመራል?",
  "kb.noPassages": "Kutaan hin argamne.",
  "kb.wordRank": "jecha #{n}",
  "kb.meaningRank": "hiika #{n}",
  "kb.choosePdf": "Faayilii PDF filadhu.",
  "kb.pdfOnly": "PDF fe'i. Lakkoofsi fuulaa akka caqafamuuf galmee Word jalqaba PDFn olkaa'i.",
  "kb.titleCropsRequired": "Mata duree fi midhaan barbaachisa.",
  "kb.uploadTitle": "Qajeelfama fe'i",
  "kb.uploadHint": "PDFn kutaaleetti qoodamee agarsiifama. Qajeelfamni gurguddoon daqiiqaa tokko fudhatu.",
  "kb.pdfFile": "Faayilii PDF",
  "kb.version": "Maxxansa",
  "kb.sourceLink": "Geessituu madda (filannoo)",
  "kb.upload": "Fe'i",

  // ── Data sync (admin) ──────────────────────────────────────────────────
  "sync.meta": "Gatii gabaa yeroo isaa eegi",
  "sync.description": "Gatii haaraa nmis.et irraa buusiitii tilmaama yeroo isaa eegi.",
  "sync.status.running": "Hojii irra",
  "sync.status.success": "Xumurameera",
  "sync.status.partial": "Hanqina waliin xumurame",
  "sync.status.failed": "Hin milkoofne",
  "sync.status.cancelled": "Dhaabbateera",
  "sync.status.interrupted": "Addaan citeera",
  "sync.retrain.running": "Haaromsaa jira",
  "sync.retrain.success": "Haaromfameera",
  "sync.retrain.skipped": "Hin barbaachifne",
  "sync.phase.starting": "Jalqabaa jira",
  "sync.phase.catalog": "Gabaawwan haaraa ilaalaa jira",
  "sync.phase.prices": "Gatii buusaa jira",
  "sync.phase.export": "Faayilii CSV barreessaa jira",
  "sync.phase.retrain": "Tilmaama gatii haaromsaa jira",
  "sync.full": "guutuu",
  "sync.quick": "saffisaa",
  "sync.unreachable": "Tajaajila walsimsiisa ragaa argachuun hin danda'amne",
  "sync.livePaused": "Haalli kallattii dhaabbateera: {error}",
  "sync.latestDate": "Guyyaa gatii dhihoo",
  "sync.dayAgo": "guyyaa {n} dura",
  "sync.daysAgo": "guyyoota {n} dura",
  "sync.priceRecords": "Galmee gatii",
  "sync.since": "{date} irraa",
  "sync.marketsCrops": "Gabaawwan · midhaanii",
  "sync.varieties": "gosa {n}",
  "sync.forecastData": "Tilmaamni ragaa hanga kanaa fayyadama",
  "sync.retrained": "Kan irra deebi'ee leenji'e {date}",
  "sync.runStopped": "Adeemsi #{id} dhaabbateera",
  "sync.runInterrupted": "Adeemsi #{id} addaan citeera",
  "sync.resumeHint": "Paarii {total} keessaa {done} buufameera. Hafe buusuuf itti fufi.",
  "sync.resume": "Itti fufi",
  "sync.history": "Seenaa walsimsiisaa",
  "sync.historyHint": "Bal'ina fi galmee isaa ilaaluuf adeemsa tokko tuqi.",
  "sync.noRuns": "Hanga ammaatti walsimsiisni hin gaggeeffamne",
  "sync.noRunsHint": "Walsimsiisa jalqabaa olitti jalqabi.",
  "sync.col.run": "Adeemsa",
  "sync.col.started": "Kan jalqabe",
  "sync.col.type": "Gosa",
  "sync.col.pairs": "Paarii",
  "sync.col.duration": "Yeroo fudhate",
  "sync.newPrices": "Gatii haaraa",
  "sync.forecasts": "Tilmaama",
  "sync.running": "Walsimsiisni #{id} hojii irra jira — walsimsiisa {scope}",
  "sync.stopping": "Dhaabaa jira…",
  "sync.stop": "Walsimsiisa dhaabi",
  "sync.eta": "Gara {time} hafeera",
  "sync.startedAt": "Kan jalqabe {date}",
  "sync.stopQ": "Walsimsiisni kun haa dhaabbatu?",
  "sync.stopBody": "Gaaffiin amma jiru jalqaba xumurama. Wanti hanga ammaatti buufame hundi ni olkaa'ama, booda itti fufuu dandeessa.",
  "sync.quickTitle": "Walsimsiisa saffisaa",
  "sync.quickText": "Gabaawwan guyyoota 90 darban keessatti gabaasan",
  "sync.fullTitle": "Walsimsiisa guutuu",
  "sync.fullText": "Gabaa beekamaa hunda",
  "sync.pairsN": "paarii {n}",
  "sync.now": "Amma walsimsiisi",
  "sync.nowHint": "Duubaan hojjeta — fuula kana dhiisuu dandeessa.",
  "sync.type": "Gosa walsimsiisaa",
  "sync.optRetrain": "Booda tilmaama gatii haaromsi (daqiiqaa 1–2)",
  "sync.optCatalog": "Tarree midhaanii gabaa hundaa irra deebi'ii ilaali (~daqiiqaa 15 dabalataa)",
  "sync.optExport": "Faayilii CSV irra deebi'ii barreessi",
  "sync.start": "Walsimsiisa {scope} jalqabi",
  "sync.scheduleSaved": "Sagantaan olkaa'ameera.",
  "sync.auto": "Walsimsiisa guyyaa ofumaan",
  "sync.next": "Itti aanu: walsimsiisa {scope} {date}",
  "sync.autoOff": "Dhaameera — gatiin kan haaromfamu harkaan yeroo walsimsiiftu qofa.",
  "sync.on": "Baname",
  "sync.off": "Dhaame",
  "sync.time": "Sa'aatii (sa'aatii sarvaraa)",
  "sync.fullOn": "Walsimsiisni guutuun guyyaa",
  "sync.never": "Gonkumaa (walsimsiisa saffisaa qofa)",
  "sync.optRetrainEach": "Walsimsiisa hunda booda tilmaama gatii haaromsi",
  "sync.optCatalogFull": "Yeroo walsimsiisa guutuu tarree midhaanii irra deebi'ii ilaali",
  "sync.showAdvanced": "Filannoo olaanaa agarsiisi",
  "sync.hideAdvanced": "Filannoo olaanaa dhoksi",
  "sync.rate": "Sekondii gaaffiiwwan gidduu",
  "sync.rateHint": "Kan gadi aanu saffisaa dha garuu nmis.et irratti ba'aa dabalata. Durtiin 1.0.",
  "sync.undo": "Deebisi",
  "sync.saveSchedule": "Sagantaa olkaa'i",
  "sync.scheduled": "sagantaan",
  "sync.manual": "harkaan",
  "sync.resumes": "#{id} itti fufa",
  "sync.runTitle": "Adeemsa walsimsiisaa #{id}",
  "sync.startedBy": "kan jalqabe {name}",
  "sync.finished": "Kan xumurame",
  "sync.pairsFetched": "Paarii buufame",
  "sync.latestBefore": "Guyyaa dhihoo kanaan dura",
  "sync.latestAfter": "Guyyaa dhihoo kanaan booda",
  "sync.fetchTime": "Yeroo buusuu",
  "sync.notRequested": "Hin gaafatamne",
  "sync.error": "Dogoggora",
  "sync.forecastUpdate": "Haaromsa tilmaamaa",
  "sync.failedPairs": "Paarii hin milkoofne ({n}) — walsimsiisa itti aanu irratti irra deebi'amee yaalama",
  "sync.log": "Galmee (sararoota 300 dhumaa)",
  "sync.noLog": "Sararri galmee hin jiru.",
  "error.requestFailed": "Gaaffiin hin milkoofne ({status})",

  // ── AI API keys (admin) ────────────────────────────────────────────────
  "nav.aiKeys": "Furtuuwwan AI",
  "aikeys.meta": "Furtuuwwan API Gemini waltajjiin walduraa duubaan fayyadamu",
  "aikeys.description": "Furtuuwwan API Gemini fi DeepSeek dabalaatii AI kamtu deebii akka barreessu filadhaa. Furtuun tokko daangaa ykn herrega yoo xumure ykn yoo didame, platformichi ofumaan gara furtuu itti aanutti jijjiira.",  // draft – needs native review
  "aikeys.add": "Furtuu dabali",
  "aikeys.usableNow": "Furtuuwwan amma hojjetan",
  "aikeys.nextFree": "Furtuun itti aanu kan bilisa ta'u",
  "aikeys.model": "Moodeela AI",
  "aikeys.noneUsable": "Amma furtuun AI hojjetu hin jiru",
  "aikeys.noneUsableHint": "Furtuuwwan hundi kooteen isaanii dhumeera, boqochaa jiru ykn didamaniiru. Hanga furtuun tokko bilisa ta'u ykn haaraa dabaltutti, gorsaan gaaffilee galmaa'an qofa deebisa.",
  "aikeys.keys": "Furtuuwwan",
  "aikeys.keysHint": "Olii gadiitti yaalamu. Tartiiba jijjiiruuf xiyyoo fayyadami.",
  "aikeys.none": "Hanga ammaatti furtuun hin dabalamne",
  "aikeys.noneHint": "Hanga tokko dabaltutti, waltajjiin GEMINI_API_KEY faayilii .env sarvaraa keessaa fayyadama.",
  "aikeys.order": "Tartiiba",
  "aikeys.label": "Maqaa",
  "aikeys.usesToday": "Gaaffilee har'aa",
  "aikeys.lastUsed": "Yeroo dhumaa itti fayyadame",
  "aikeys.enabled": "Hojii irra",
  "aikeys.moveUp": "Ol baasi",
  "aikeys.moveDown": "Gad buusi",
  "aikeys.test": "Yaali",
  "aikeys.reset": "Irra deebi'ii jalqabi",
  "aikeys.status.unknown": "Hanga ammaatti hin fayyadamne",
  "aikeys.status.ok": "Hojjetaa jira",
  "aikeys.status.quota": "Kooteen dhumeera",
  "aikeys.status.rateLimited": "Daangaa saffisaa",
  "aikeys.status.invalid": "Didameera",
  "aikeys.status.error": "Dogoggora",
  "aikeys.status.disabled": "Dhaameera",
  "aikeys.until": "hanga {date}",
  "aikeys.testOk": "\"{label}\" ni hojjeta.",
  "aikeys.testFailed": "\"{label}\" hin hojjenne: {message}",
  "aikeys.resetDone": "\"{label}\" irra deebi'ee ni yaalama.",
  "aikeys.envTitle": "Furtuu kaa'amaa sarvaraa irraa",
  "aikeys.envHint": "GEMINI_API_KEY faayilii .env keessaa furtuuwwan olii hunda booda yaalama.",
  "aikeys.howTitle": "Jijjiirraan akkamitti hojjeta",
  "aikeys.howBody": "Kooteen guyyaa yoo dhume: furtuun hanga yeroo Gemini haaromsutti boqota. Daangaan daqiiqaa yoo mudate: sekondii Gemini gaafatuuf boqota. Furtuun didame: hanga yaaltu ykn irra deebi'ii jalqabsiiftutti ni darbama. Furtuu yaaluun kootee isaa irraa gaaffii tokko fayyadama.",
  "aikeys.added": "\"{label}\" dabalameera.",
  "aikeys.deleteQ": "Furtuun kun haa haqamuu?",
  "aikeys.deleteBody": "\"{label}\" (•••• {last4}) waltajjii irraa ni haqama.",
  "aikeys.deleted": "\"{label}\" haqameera.",
  "aikeys.addTitle": "Furtuu API Gemini dabali",
  "aikeys.addHint": "Dhiyeessaa filadhaa, achiis furtuu maxxansaa.",  // draft – needs native review
  "aikeys.labelPlaceholder": "fkn. Pirojektii 2 (bilisa)",
  "aikeys.apiKey": "Furtuu API",
  "aikeys.storedEncrypted": "Furtuun icciitiin olkaa'ama, deebi'ee hin mul'atu; qubee dhumaa 4 qofatu mul'ata.",
  "aikeys.addInvalid": "Maqaa fi furtuu API guutuu galchi.",

  // ── Text-to-speech ─────────────────────────────────────────────────────
  "tts.listen": "Dhaggeeffadhu",
  "tts.stop": "Dhaabi",
  "tts.loading": "Sagalee qopheessaa jira…",
  "tts.failed": "Sagaleen hin jiru",

  // ── Consent & my data ─────────────────────────────────────────────────────
  "consent.title": "Odeeffannoo fi hayyama koo",  // draft – needs native review
  "consent.description": "Odeeffannoo keessan eenyu akka arguu danda'u isin murteessitu. Yeroo kamiyyuu jijjiiruu dandeessu.",  // draft – needs native review
  "consent.data": "Ogeeyyiin ekisteenshinii qonna koo, qorannoo midhaan koo fi gaaffii koo akka argan hayyami",  // draft – needs native review
  "consent.dataHint": "Hojjetaan misoomaa (DA) keessan isin gargaaruuf fi yeroo midhaan keessan rakkoo qabu isin daawwachuuf itti fayyadama.",  // draft – needs native review
  "consent.alerts": "Akeekkachiisaa fi yaadachiisa naaf ergi",  // draft – needs native review
  "consent.alertsHint": "Akeekkachiisa dhukkubaa qonna koo bira jiru fi gaaffii hordoffii guyyaa 7.",  // draft – needs native review
  "consent.legalDraft": "Barreeffama qophii, gamaaggama seeraa eegaa jira (Labsii Eegumsa Odeeffannoo Dhuunfaa 1321/2024).",  // draft – needs native review
  "consent.history": "Seenaa jijjiiramaa",  // draft – needs native review
  "consent.noHistory": "Hanga ammaatti jijjiiramni hin jiru.",  // draft – needs native review
  "consent.granted": "Banameera",  // draft – needs native review
  "consent.withdrawn": "Cufameera",  // draft – needs native review
  "consent.kind.data": "Ogeeyyiif qooduu",  // draft – needs native review
  "consent.kind.alerts": "Akeekkachiisa",  // draft – needs native review
  "consent.byOther": "{name}n galmeeffame",  // draft – needs native review
  "consent.download": "Odeeffannoo koo buufadhu",  // draft – needs native review
  "consent.downloadHint": "Faayilii waan sirni waa'ee keessan kuusu hunda qabu.",  // draft – needs native review
  "consent.saved": "Olkaa'ameera.",  // draft – needs native review
  "signup.consentData": "Ogeeyyiin ekisteenshinii odeeffannoo qonna koo akka argan hayyami (filannoo)",  // draft – needs native review
  "signup.consentAlerts": "Akeekkachiisa dhukkubaa fi yaadachiisa naaf ergi (filannoo)",  // draft – needs native review
  "signup.consentNote": "Kana yeroo kamiyyuu piroofaayilii keessan keessatti jijjiiruu dandeessu.",  // draft – needs native review

  // ── DA Copilot ────────────────────────────────────────────────────────────
  "nav.daCopilot": "Gargaaraa DA",  // draft – needs native review
  "nav.daInbox": "Dhimmoota dabarfaman",  // draft – needs native review
  "perm.da_work": "Akka hojjetaa misoomaatti hojjechuu",  // draft – needs native review
  "perm.da_work.desc": "Qonnaan bultoota koo fi tarree daawwannaa koo arguu, gaaffii dabarfaman deebisuu, qorannoo mirkaneessuu fi qonnaan bultoota galmeessuu.",  // draft – needs native review
  "da.meta": "Qonnaan bultoota keessan fi eenyu dursee daawwatamuu qabu.",  // draft – needs native review
  "da.description": "Qonnaan bultoota keessan kanneen odeeffannoo isaanii qooduuf walii galan, fi eenyu daawwannaa dursee barbaada.",  // draft – needs native review
  "da.visits": "Dursaa daawwadhaa",  // draft – needs native review
  "da.visitsHint": "Akka barbaachisummaatti tarreeffame: dursee midhaan hammaate, itti aansee qorannoo suuraa hin mirkanoofne, hordoffii darbe, dhukkuba naannoo jiru fi gaaffii hin deebifamne.",  // draft – needs native review
  "da.noVisits": "Amma namni daawwannaa barbaadu hin jiru.",  // draft – needs native review
  "da.points": "qabxii {n}",  // draft – needs native review
  "da.waitingSince": "{date} irraa kaasee eegaa jira",  // draft – needs native review
  "da.reason.worse": "Gorsa booda midhaan hammaate",  // draft – needs native review
  "da.reason.uncertain_diagnosis": "Qorannoon suuraa hin mirkanoofne, mirkaneessa keessan barbaada",  // draft – needs native review
  "da.reason.overdue_follow_up": "Hordoffiin guyyaa 7 darbe",  // draft – needs native review
  "da.reason.outbreak_nearby": "Dhukkubni naannoo babal'ate",  // draft – needs native review
  "da.reason.open_question": "Gaaffii deebii eegu",  // draft – needs native review
  "da.farmers": "Qonnaan bultoota koo",  // draft – needs native review
  "da.farmersHint": "Qonnaan bultoota odeeffannoo isaanii ogeeyyii waliin qooduuf walii galan qofatu mul'ata.",  // draft – needs native review
  "da.noFarmers": "Ammaaf qonnaan bultaan hin jiru. Qonnaan bulaa galmeessaa, ykn bulchaan qonnaan bultoota akka isiniif ramadu gaafadhaa.",  // draft – needs native review
  "da.col.farmer": "Qonnaan bulaa",  // draft – needs native review
  "da.col.crop": "Midhaan fi sadarkaa",  // draft – needs native review
  "da.col.lastCheck": "Qorannoo suuraa isa dhumaa",  // draft – needs native review
  "da.col.open": "Dhimmoota banaa",  // draft – needs native review
  "da.assignedToMe": "Anaaf ramadame",  // draft – needs native review
  "da.day": "guyyaa {n}",  // draft – needs native review
  "da.noCrop": "Waqtiin midhaanii hojii irra jiru hin jiru",  // draft – needs native review
  "da.noCheck": "Ammaaf hin jiru",  // draft – needs native review
  "da.openCount": "{n} banaa",  // draft – needs native review
  "da.overdueCount": "{n} darbe",  // draft – needs native review
  "da.register": "Qonnaan bulaa galmeessi",  // draft – needs native review
  "da.registerHint": "Qonnaan bultoota appii hin qabneef. Gaaffii hayyamaa lamaan sagalee ol kaasaa dubbisaa, waan qonnaan bulaan itti walii gale qofa mallatteessaa.",  // draft – needs native review
  "da.pin": "Jecha darbii yeroo",  // draft – needs native review
  "da.pinHint": "Yoo xiqqaate qubee 6. Qonnaan bulaaf kennaa; booda jijjiiruu danda'u.",  // draft – needs native review
  "da.kebele": "Ganda (filannoo)",  // draft – needs native review
  "da.consentDataAsk": "Qonnaan bulaan ogeeyyiin ekisteenshinii odeeffannoo qonna isaa akka argan walii gale",  // draft – needs native review
  "da.consentAlertsAsk": "Qonnaan bulaan akeekkachiisa dhukkubaa fi yaadachiisa barbaada",  // draft – needs native review
  "da.consentNoData": "Walii galtee kana malee erga galmeessitanii booda qonnaan bulaa kana hin argitan.",  // draft – needs native review
  "da.registered": "{name} galmaa'eera.",  // draft – needs native review
  "da.actingFor": "Kan gaafachaa jirtan",  // draft – needs native review
  "da.myself": "Ofii koof",  // draft – needs native review
  "da.inboxDescription": "Gaaffii gorsaan deebisuu hin dandeenye, fi midhaan nama barbaadu.",  // draft – needs native review
  "da.status.open": "Banaa",  // draft – needs native review
  "da.status.answered": "Deebifame",  // draft – needs native review
  "da.status.forwarded": "Dabarfame",  // draft – needs native review
  "da.status.closed": "Cufame",  // draft – needs native review
  "da.esc.low_confidence": "Qorannoon suuraa hin mirkanoofne",  // draft – needs native review
  "da.esc.no_knowledge": "Qajeelfamoota keessa deebiin hin jiru",  // draft – needs native review
  "da.esc.guardrail_block": "Nageenyaaf dhaabbate",  // draft – needs native review
  "da.esc.advice_failed": "Midhaan hammaate",  // draft – needs native review
  "da.esc.asked_for_person": "Nama akka dubbisu gaafate",  // draft – needs native review
  "da.question": "Gaaffii",  // draft – needs native review
  "da.aiAnswer": "Deebii gorsaa",  // draft – needs native review
  "da.diagnosis": "Qorannoo suuraa: {disease} ({pct}%)",  // draft – needs native review
  "da.verified": "DA'n mirkaneesse: {disease}",  // draft – needs native review
  "da.verifyLabel": "Midhaan irratti maal argitu?",  // draft – needs native review
  "da.verify": "Mirkaneessa koo olkaa'i",  // draft – needs native review
  "da.answerLabel": "Deebii keessan qonnaan bulaaf",  // draft – needs native review
  "da.answerHint": "Qonnaan bulaan kana appii keessatti arga, dhaggeeffachuus ni danda'a.",  // draft – needs native review
  "da.send": "Deebii ergi",  // draft – needs native review
  "da.forward": "Bulchaaf dabarsi",  // draft – needs native review
  "da.close": "Cufi",  // draft – needs native review
  "da.noEscalations": "Asitti homtuu hin jiru.",  // draft – needs native review
  "da.resolution": "Deebii ykn yaadannoo",  // draft – needs native review
  "da.saved": "Olkaa'ameera.",  // draft – needs native review
  "users.da": "Hojjetaa misoomaa",  // draft – needs native review
  "users.noDa": "Hojjetaan hin ramadamne",  // draft – needs native review

  // ── Crop calendar & seasons ───────────────────────────────────────────────
  "stage.establishment": "Facaasuu fi biqiluu",  // draft – needs native review
  "stage.tillering": "Dameessuu",  // draft – needs native review
  "stage.stem_elongation": "Dheerachuu qaamaa",  // draft – needs native review
  "stage.heading_flowering": "Mataa baasuu fi daraaruu",  // draft – needs native review
  "stage.grain_fill": "Firii guutuu",  // draft – needs native review
  "stage.maturity": "Bilchaachuu fi galfachuu",  // draft – needs native review
  "season.meher": "Meher (roobni gurguddaan)",  // draft – needs native review
  "season.belg": "Belg (roobni gabaabaan)",  // draft – needs native review
  "season.irrigated": "Jallisii",  // draft – needs native review
  "calendar.title": "Kaalaandarii midhaan koo",  // draft – needs native review
  "calendar.description": "Midhaan keessan amma eessa akka jiru fi itti aansee maal akka hojjettan, qajeelfamoota qamadii Ministeera Qonnaa irraa.",  // draft – needs native review
  "calendar.estimated": "Yeroo tilmaamaa. Hojjetaa misoomaa keessan waliin mirkaneeffadhaa.",  // draft – needs native review
  "calendar.planted": "Kan facaafame {date}",  // draft – needs native review
  "calendar.day": "Guyyaa {n}ffaa erga facaafamee",  // draft – needs native review
  "calendar.now": "Amma",  // draft – needs native review
  "calendar.tasks": "Sadarkaa kana keessatti maal hojjechuu qabdu",  // draft – needs native review
  "calendar.tasksNote": "Hojiiwwan akkuma qajeelfamoota ministeeraa keessatti barreeffaman (Afaan Ingilizii).",  // draft – needs native review
  "calendar.next": "Itti aanu: {stage} guyyaa {n} keessatti",  // draft – needs native review
  "calendar.pastLast": "Midhaan kun sadarkaa dhumaa kaalaandarii darbeera. Piroofaayilii koo keessatti akka galfatame mallatteessaa.",  // draft – needs native review
  "calendar.unknown": "Midhaan fi bakka kanaaf ammaaf kaalaandariin midhaanii hin jiru.",  // draft – needs native review
  "calendar.empty": "Maal akka facaaftan fi yoom akka facaaftan nutti himaa; kaalaandariin sadarkaa fi hojiiwwan midhaan keessanii ni agarsiisa.",  // draft – needs native review
  "calendar.addSeason": "Waan facaase dabali",  // draft – needs native review
  "calendar.source": "Madda: {source}",  // draft – needs native review
  "seasons.button": "Waqtiiwwan",  // draft – needs native review
  "seasons.title": "Waqtiiwwan midhaanii: {field}",  // draft – needs native review
  "seasons.hint": "Lafa qonnaa tokko irratti yeroo tokkotti midhaan tokko qofa. Yeroo xumurtan akka galfatame mallatteessaa.",  // draft – needs native review
  "seasons.none": "Ammaaf waqtiin midhaanii hin jiru.",  // draft – needs native review
  "seasons.crop": "Midhaan",  // draft – needs native review
  "seasons.variety": "Gosa (filannoo)",  // draft – needs native review
  "seasons.planted": "Guyyaa facaasaa",  // draft – needs native review
  "seasons.kind": "Waqtii",  // draft – needs native review
  "seasons.harvest": "Galfannaa eegamu (filannoo)",  // draft – needs native review
  "seasons.add": "Waqtii dabali",  // draft – needs native review
  "seasons.markHarvested": "Akka galfatame mallatteessi",  // draft – needs native review
  "seasons.status.active": "Guddachaa jira",  // draft – needs native review
  "seasons.status.harvested": "Galfatameera",  // draft – needs native review
  "seasons.status.failed": "Hin milkoofne",  // draft – needs native review
  "seasons.growing": "Amma kan guddachaa jiru: {crop} {date} irraa kaasee",  // draft – needs native review

  // ── Advisory settings, monitoring, audit log ──────────────────────────────
  "nav.advisorySettings": "Qindaa'ina gorsaa",  // draft – needs native review
  "nav.monitoring": "Hordoffii",  // draft – needs native review
  "nav.auditLog": "Galmee odiitii",  // draft – needs native review
  "perm.audit_read": "Galmee odiitii dubbisuu",  // draft – needs native review
  "perm.audit_read.desc": "Bulchiinsa keessatti eenyu maal akka jijjiire, fi eenyu odeeffannoo qonnaan bultootaa akka bane arguu.",  // draft – needs native review
  "settings.description": "Safartuuwwan gorsaan qorannoo suuraa, akeekkachiisa dhukkubaa fi daangaa akeekkachiisaaf itti fayyadamu. Jijjiiramni battalumatti hojii irra oola.",  // draft – needs native review
  "settings.note": "Kunniin murtoo oomishaa malee dhugaa saayinsii qonnaa miti. Jijjiirama garee ogeeyyii qonnaa waliin irratti walii galaa.",  // draft – needs native review
  "settings.allowed": "Kan hayyamame: {min} hanga {max}",  // draft – needs native review
  "settings.default": "Durtii: {value}",  // draft – needs native review
  "settings.save": "Olkaa'i",  // draft – needs native review
  "settings.saved": "Olkaa'ameera: {name}.",  // draft – needs native review
  "settings.on": "Banaa",  // draft – needs native review
  "settings.off": "Cufaa",  // draft – needs native review
  "settings.diagnosis_confidence_threshold": "Qorannoo suuraa: amanamummaa xiqqaa",  // draft – needs native review
  "settings.diagnosis_confidence_threshold.hint": "Amanamummaa kanaa (0 hanga 1) gadi yoo ta'e qorannoon suuraa akka hin mirkanoofneetti ilaalamee DA'f ergama.",  // draft – needs native review
  "settings.follow_up_days": "Hordoffii booda (guyyaa)",  // draft – needs native review
  "settings.follow_up_days.hint": "Erga qorannoo suuraa booda guyyoota osoo hin gaafatin dura midhaan fooyya'uu isaa.",  // draft – needs native review
  "settings.outbreak_radius_km": "Raadiyaasii dhukkubaa (km)",  // draft – needs native review
  "settings.outbreak_radius_km.hint": "Fageenya keessatti qorannoon dhukkubaa ollaa lakkaa'amu.",  // draft – needs native review
  "settings.outbreak_window_days": "Guyyoota duubatti ilaalaman (dhukkuba)",  // draft – needs native review
  "settings.outbreak_window_days.hint": "Qorannoowwan guyyoota dhihoo kana keessaa qofatu lakkaa'ama.",  // draft – needs native review
  "settings.outbreak_min_scans": "Qorannoowwan akeekkachiisa kaasan",  // draft – needs native review
  "settings.outbreak_min_scans.hint": "Baay'ina qorannoo dhukkuba tokkoo raadiyaasii fi yeroo keessatti akeekkachiisa kaasu.",  // draft – needs native review
  "settings.outbreak_verified_only": "Kan DA'n mirkaneesse qofa lakkaa'i",  // draft – needs native review
  "settings.outbreak_verified_only.hint": "Yoo banaa ta'e: qorannoowwan DA'n mirkaneesse qofatu akeekkachiisaaf lakkaa'ama.",  // draft – needs native review
  "settings.diagnosis_history_days": "Seenaa qorannoo suuraa gorsaaf (guyyaa)",  // draft – needs native review
  "settings.diagnosis_history_days.hint": "Gorsaan qorannoo suuraa qonnaan bulaa hammam duubatti akka ilaalu.",  // draft – needs native review
  "settings.max_alerts_per_week": "Akeekkachiisa qonnaan bulaa tokkoof torbaanitti",  // draft – needs native review
  "settings.max_alerts_per_week.hint": "Daangaa torbanii durtii; akeekkachiisni dabalataa ni qabama.",  // draft – needs native review
  "settings.strict_dose_policy": "Imaammata hamma cimaa",  // draft – needs native review
  "settings.strict_dose_policy.hint": "Yoo banaa ta'e: hammi hundi gabatee hamma mirkanaa'e irraa dhufuu qaba. Yoo cufaa ta'e: hammi xaa'oo fi sanyii lakkoofsi sirrii barreeffama ministeeraa wabeeffame keessa yoo jiraate caqasamuu danda'a. Hammi qoricha ilbiisotaa yeroo hunda gabatee qofa irraa.",  // draft – needs native review
  "monitor.description": "Gorsaan akkamitti itti fayyadamamaa jira. Ida'ama qofa, odeeffannoo dhuunfaa hin qabu.",  // draft – needs native review
  "monitor.days": "Guyyoota {n} darban",  // draft – needs native review
  "monitor.questions": "Gaaffiiwwan",  // draft – needs native review
  "monitor.escalationRate": "Namaaf kan dabarfame",  // draft – needs native review
  "monitor.diagnoses": "Qorannoo suuraa",  // draft – needs native review
  "monitor.agreement": "DA'n qorannoo suuraa waliin kan walii gale",  // draft – needs native review
  "monitor.resolveTime": "Yeroo deebii giddu-galeessaa",  // draft – needs native review
  "monitor.hours": "sa'aatii {n}",  // draft – needs native review
  "monitor.consentData": "Qonnaan bultoota odeeffannoo qoodan",  // draft – needs native review
  "monitor.ofFarmers": "Qonnaan bultoota {total} keessaa {n}",  // draft – needs native review
  "monitor.perDay": "Gaaffii fi qorannoo suuraa guyyaatti",  // draft – needs native review
  "monitor.byLanguage": "Gaaffiiwwan afaaniin",  // draft – needs native review
  "monitor.confidence": "Amanamummaa deebii",  // draft – needs native review
  "monitor.flags": "Sakatta'insa nageenyaa ka'an",  // draft – needs native review
  "monitor.feedback": "Yaada qonnaan bultootaa",  // draft – needs native review
  "monitor.byDisease": "Qorannoo suuraa dhukkubaan",  // draft – needs native review
  "monitor.outcomes": "Bu'aa hordoffii",  // draft – needs native review
  "monitor.escReasons": "Sababa dhimmoonni namaaf dabarfaman",  // draft – needs native review
  "monitor.alerts": "Akeekkachiisa",  // draft – needs native review
  "monitor.none": "Yeroo kana keessatti odeeffannoon hin jiru.",  // draft – needs native review
  "monitor.uncertain": "Hin mirkanoofne",  // draft – needs native review
  "audit.description": "Bulchiinsa keessatti eenyu maal akka jijjiire, fi eenyu odeeffannoo qonnaan bultootaa akka bane. Qabiyyeen gaaffii gonkumaa hin kuufamu.",  // draft – needs native review
  "audit.filter": "Gochaan calaqi",  // draft – needs native review
  "audit.when": "Yoom",  // draft – needs native review
  "audit.who": "Eenyu",  // draft – needs native review
  "audit.action": "Gocha",  // draft – needs native review
  "audit.target": "Galmee",  // draft – needs native review
  "audit.result": "Bu'aa",  // draft – needs native review
  "audit.read": "Odeeffannoo qonnaan bulaa bane",  // draft – needs native review
  "audit.loadMore": "Dabalataan fidi",  // draft – needs native review
  "audit.none": "Galmeen hin jiru.",  // draft – needs native review
  "audit.unknownActor": "Kan hin seenne",  // draft – needs native review

  // ── Area reports & government role ────────────────────────────────────────
  "role.government": "Mootummaa (dubbisuuf qofa)",  // draft – needs native review
  "role.government.desc": "Hojjettoota aanaa, biiroo naannoo, ATI ykn Ministeera Qonnaa. Gabaasa walitti qabamee fi kaartaa dhukkubaa naannoo isaaniif argu; qonnaan bultoota tokko tokkoon gonkumaa hin argan.",  // draft – needs native review
  "perm.reports_read": "Gabaasa naannoo arguu",  // draft – needs native review
  "perm.reports_read.desc": "Lakkoofsota walitti qabaman naannoo isaaniif: qonnaan bultoota bira ga'aman, qorannoo suuraa dhukkubaan, dhukkuboota babal'atan, akeekkachiisa. Lakkoofsonni xixiqqoon ni dhokatu.",  // draft – needs native review
  "nav.reports": "Gabaasa naannoo",  // draft – needs native review
  "reports.description": "Ida'ama naannoo keessanii: qonnaan bultoota bira ga'aman, qorannoo suuraa dhukkubaan, dhukkuboota babal'atan fi akeekkachiisa. Qonnaan bultoonni tokko tokkoon hin mul'atan.",  // draft – needs native review
  "reports.scope": "Naannoo: {area}",  // draft – needs native review
  "reports.country": "Biyya guutuu",  // draft – needs native review
  "reports.period": "Guyyoota {n} darban",  // draft – needs native review
  "reports.export": "CSV baasi",  // draft – needs native review
  "reports.print": "Maxxansi ykn akka PDF olkaa'i",  // draft – needs native review
  "reports.farmers": "Qonnaan bultoota galmaa'an",  // draft – needs native review
  "reports.reached": "Qonnaan bultoota bira ga'aman",  // draft – needs native review
  "reports.questions": "Gaaffiiwwan",  // draft – needs native review
  "reports.photoChecks": "Qorannoo suuraa",  // draft – needs native review
  "reports.outbreakAlerts": "Akeekkachiisa dhukkubaa",  // draft – needs native review
  "reports.escalations": "Dhimmoota DA'f ergaman",  // draft – needs native review
  "reports.outcomes": "Hordoffii: fooyya'e / akkuma jiru / hammaate",  // draft – needs native review
  "reports.byDisease": "Qorannoo suuraa dhukkubaan",  // draft – needs native review
  "reports.woredas": "Aanaadhaan",  // draft – needs native review
  "reports.col.woreda": "Aanaa",  // draft – needs native review
  "reports.col.zone": "Godina",  // draft – needs native review
  "reports.noData": "Naannoo fi yeroo kana keessatti sochiin hin jiru.",  // draft – needs native review
  "reports.map": "Akeekkachiisa duraa dhukkubaa",  // draft – needs native review
  "reports.mapHint": "Gabaasa dhukkubaa guyyoota {n} darban, giddu-gala aanaa irratti kaa'ame (qonna irratti miti). Tuqaan guddaan gabaasa baay'ee jechuudha.",  // draft – needs native review
  "reports.demo": "Galmeewwan fakkeenyaa dabaluu",  // draft – needs native review
  "reports.demoBadge": "galmeewwan fakkeenyaa ni dabalata",  // draft – needs native review
  "reports.band.high": "10 fi isaa ol",  // draft – needs native review
  "reports.band.medium": "5 hanga 9",  // draft – needs native review
  "reports.band.low": "5 gadi",  // draft – needs native review
  "reports.noOutbreaks": "Yeroo kana keessatti gabaasni dhukkubaa hin jiru.",  // draft – needs native review
  "reports.suppressedNote": "\"<5\" jechuun 1 hanga 4 jechuudha. Qonnaan bulaan kamiyyuu akka hin beekamneef lakkoofsonni xixiqqoon ni dhokatu.",  // draft – needs native review
  "reports.latest": "isa dhumaa {date}",  // draft – needs native review

  // ── Input Trust ───────────────────────────────────────────────────────────
  "nav.verify": "Oomisha mirkaneessi",  // draft – needs native review
  "nav.supplier": "Seensa dhiyeessaa",  // draft – needs native review
  "nav.orgs": "Dhaabbilee",  // draft – needs native review
  "role.supplier": "Dhiyeessaa",  // draft – needs native review
  "role.supplier.desc": "Hojjetaa dhiyeessaa galtee. Oomishaalee fi garee koodii dhaabbatichaa ni bulcha; koodiiwwan isaa eessatti akka mirkanaa'an ni arga.",  // draft – needs native review
  "perm.inputs_verify": "Koodii oomishaa mirkaneessuu",  // draft – needs native review
  "perm.inputs_verify.desc": "Paakeejiin sanyii, xaa'oo ykn keemikaalaa dhugaa ta'uu isaa mirkaneessuu fi oomisha sobaa shakkame gabaasuu.",  // draft – needs native review
  "perm.supplier_manage": "Dhaabbata dhiyeessaa ofii bulchuu",  // draft – needs native review
  "perm.supplier_manage.desc": "Oomishaalee tarreessuu, garee koodii fi mallattoo uumuu, garee deebisuu fi gabaasa mirkaneessaa arguu.",  // draft – needs native review
  "perm.orgs_manage": "Dhaabbilee bulchuu",  // draft – needs native review
  "perm.orgs_manage.desc": "Dhaabbilee dhiyeessaa uumuu, fayyadamtoota isaanii dabaluu fi dhorkuu.",  // draft – needs native review
  "demo.message.trust": "Tarreen oomishaa maanuwaalii qamadii MoA irraa fudhatame. Lakkoofsonni galmee galmeen EAA seera qabeessi yeroo walqabatu dhufu.",  // draft – needs native review
  "trust.description": "Koodii QR paakeejii sanyii, xaa'oo ykn keemikaalaa irra jiru sakatta'aa ykn koodii isaa barreessaa, dhugaa ta'uu isaa beekuuf.",  // draft – needs native review
  "trust.codeLabel": "Koodii oomishaa",  // draft – needs native review
  "trust.codePlaceholder": "fkn. AB3D-EF7H-JK9M",  // draft – needs native review
  "trust.check": "Mirkaneessi",  // draft – needs native review
  "trust.scan": "Koodii QR sakatta'i",  // draft – needs native review
  "trust.scanStop": "Kaameraa dhaabi",  // draft – needs native review
  "trust.scanUnsupported": "Biraawuzariin kun koodii QR sakatta'uu hin danda'u. Koodii QR jalatti maxxanfame barreessaa.",  // draft – needs native review
  "trust.genuine": "Dhugaa",  // draft – needs native review
  "trust.warning": "Akeekkachiisa",  // draft – needs native review
  "trust.genuineText": "Koodiin kun oomisha galmaa'e kan dhiyeessaa beekamaa irraa ti.",  // draft – needs native review
  "trust.reason.unknown_code": "Koodii kana hin beeknu. Paakeejichi soba ta'uu danda'a. Itti hin fayyadaminaa; armaan gaditti gabaasaa.",  // draft – needs native review
  "trust.reason.recalled": "Dhiyeessaan garee kana deebisee jira. Itti hin fayyadaminaa; suuqiitti deebisaa.",  // draft – needs native review
  "trust.reason.supplier_suspended": "Dhiyeessaan kun dhorkameera. Oomisha kana fayyadamuu dura hojjetaa misoomaa keessan gaafadhaa.",  // draft – needs native review
  "trust.reason.not_registered": "Oomishni kun tarree oomishaalee galmaa'an keessa hin jiru. Itti hin fayyadaminaa.",  // draft – needs native review
  "trust.reason.expired": "Yeroon garee kanaa darbeera. Itti hin fayyadaminaa.",  // draft – needs native review
  "trust.reason.possible_copy": "Koodiin kun kan eegamuu ol yeroo baay'ee ykn bakka baay'eetti mirkanaa'eera. Paakeejii sobaa irratti garagalfamee ta'uu danda'a. Paakeejicha of eeggannoon ilaalaa; hojjetaa misoomaa keessan gaafadhaa.",  // draft – needs native review
  "trust.product": "Oomisha",  // draft – needs native review
  "trust.ingredient": "Qabiyyee hojii",  // draft – needs native review
  "trust.registration": "Lakk. galmee",  // draft – needs native review
  "trust.supplier": "Dhiyeessaa",  // draft – needs native review
  "trust.batch": "Garee",  // draft – needs native review
  "trust.expires": "Kan dhumatu",  // draft – needs native review
  "trust.batchNote": "Koodiin tokko garee guutuu of keessatti qabata. Bu'aan dhugaa koodiin sun dhugaa ta'uu agarsiisa; paakeejiin kun gonkumaa akka hin garagalfamne garuu mirkaneessuu hin danda'u.",  // draft – needs native review
  "trust.reportTitle": "Oomisha sobaa shakkame gabaasi",  // draft – needs native review
  "trust.reportHint": "Waan argitan nutti himaa. Aanaan keessan piroofaayilii keessan irraa ni dabalama; maqaan keessan dhiyeessaaf hin mul'atu.",  // draft – needs native review
  "trust.reportProduct": "Oomisha (tarree keessa yoo jiraate)",  // draft – needs native review
  "trust.reportProductText": "Maqaa oomishaa paakeejii irra jiru",  // draft – needs native review
  "trust.reportShop": "Bakka itti bittan (suuqii ykn gabaa)",  // draft – needs native review
  "trust.reportNote": "Maaltu dogoggora fakkaata?",  // draft – needs native review
  "trust.reportSend": "Gabaasa ergi",  // draft – needs native review
  "trust.reportSent": "Galatoomaa. Gabaasni keessan ergameera.",  // draft – needs native review
  "trust.notListed": "Tarree keessa hin jiru",  // draft – needs native review
  "supplier.description": "Oomishaalee keessan, garee koodii keessan fi koodiiwwan keessan eessatti akka mirkanaa'an.",  // draft – needs native review
  "supplier.chooseOrg": "Dhaabbata",  // draft – needs native review
  "supplier.catalogue": "Oomishaalee koo",  // draft – needs native review
  "supplier.catalogueHint": "Tarree oomishaalee galmaa'an keessaa filadhaa. Koodii uumuu kan dandeessan oomishaalee asitti tarreeffamaniif qofa.",  // draft – needs native review
  "supplier.addProduct": "Oomisha dabali",  // draft – needs native review
  "supplier.remove": "Haqi",  // draft – needs native review
  "supplier.noProducts": "Ammaaf oomishni hin jiru.",  // draft – needs native review
  "supplier.batches": "Garee koodii",  // draft – needs native review
  "supplier.batchesHint": "Gareen tokkoon tokkoon koodii tokko argata. Mallattoo sana paakeejii garee sanaa hunda irratti maxxansaa.",  // draft – needs native review
  "supplier.newBatch": "Garee haaraa",  // draft – needs native review
  "supplier.batchNumber": "Lakkoofsa garee",  // draft – needs native review
  "supplier.units": "Baay'ina paakeejii",  // draft – needs native review
  "supplier.manufactured": "Guyyaa oomishame",  // draft – needs native review
  "supplier.expires": "Guyyaa dhumatu",  // draft – needs native review
  "supplier.create": "Garee uumi",  // draft – needs native review
  "supplier.label": "Mallattoo maxxansi",  // draft – needs native review
  "supplier.recall": "Deebisi",  // draft – needs native review
  "supplier.recallConfirm": "Gareen {batch} haa deebi'uu? Sana booda mirkaneessi koodii kanaa hundi akeekkachiisa deebisuu ni agarsiisa.",  // draft – needs native review
  "supplier.recalled": "Deebifameera",  // draft – needs native review
  "supplier.active": "Hojii irra",  // draft – needs native review
  "supplier.checks": "Mirkaneessaawwan",  // draft – needs native review
  "supplier.warnings": "Akeekkachiisawwan",  // draft – needs native review
  "supplier.noBatches": "Ammaaf gareen hin jiru.",  // draft – needs native review
  "supplier.report": "Koodiiwwan keessan eessatti akka mirkanaa'an",  // draft – needs native review
  "supplier.reportHint": "Guyyoota {n} darban. Maqaan qonnaan bultootaa gonkumaa hin mul'atu.",  // draft – needs native review
  "supplier.byReason": "Bu'aawwan",  // draft – needs native review
  "supplier.byWoreda": "Aanaadhaan",  // draft – needs native review
  "supplier.fakes": "Gabaasa oomisha sobaa shakkamee",  // draft – needs native review
  "supplier.noFakes": "Gabaasni hin jiru.",  // draft – needs native review
  "orgs.description": "Dhaabbilee dhiyeessaa fi fayyadamtoota isaanii. Fayyadamaan osoo hin dabalamin dura gahee Dhiyeessaa qabaachuu qaba.",  // draft – needs native review
  "orgs.new": "Dhaabbata haaraa",  // draft – needs native review
  "orgs.name": "Maqaa",  // draft – needs native review
  "orgs.note": "Yaadannoo (filannoo)",  // draft – needs native review
  "orgs.create": "Uumi",  // draft – needs native review
  "orgs.members": "Fayyadamtoota",  // draft – needs native review
  "orgs.addMember": "Fayyadamaa dabali",  // draft – needs native review
  "orgs.phone": "Lakkoofsa bilbilaa fayyadamaa",  // draft – needs native review
  "orgs.owner": "Abbaa qabeenyaa",  // draft – needs native review
  "orgs.staff": "Hojjetaa",  // draft – needs native review
  "orgs.suspend": "Dhorki",  // draft – needs native review
  "orgs.activate": "Hojii irra oolchi",  // draft – needs native review
  "orgs.suspended": "Dhorkameera",  // draft – needs native review
  "orgs.none": "Ammaaf dhaabbanni hin jiru.",  // draft – needs native review
  "orgs.batchesCount": "Garee {n}",  // draft – needs native review

  // ── Voice questions ───────────────────────────────────────────────────────
  "voice.record": "Gaaffii keessan sagaleedhaan dubbadhaa",  // draft – needs native review
  "voice.stop": "Waraabuu dhaabi",  // draft – needs native review
  "voice.working": "Dubbiin keessan gara barreeffamaatti jijjiiramaa jira…",  // draft – needs native review
  "voice.privacy": "Waraabamaa jira… Sagaleen keessan gara barreeffamaatti jijjiiruuf qofa Google Gemini'f ergama. Hin kuufamu.",  // draft – needs native review
  "voice.unsupported": "Gaaffiin sagaleen maayikiroofoonii barbaada; biraawuzariin kun kan hayyamu walitti dhufeenya nageenya qabu (https) qofaan. Maaloo gaaffii keessan barreessaa.",  // draft – needs native review
  "voice.check": "Barreeffamicha mirkaneessaa, sana booda ergaa.",  // draft – needs native review
  "voice.unverified": "Beekumsi sagalee afaan kanaaf haaraa dha. Barreeffamicha of eeggannoon mirkaneessaa, sana booda ergaa.",  // draft – needs native review

  // ── Delete my data ────────────────────────────────────────────────────────
  "nav.erasure": "Gaaffii haquu odeeffannoo",  // draft – needs native review
  "seasons.noGuidance": "Midhaan kanaaf ammaaf kaalaandariin ykn gorsi hin jiru. Yeroo qajeelfamoonni ministeeraa kuusaa beekumsaa keessa galan ni dabalama.",  // draft – needs native review
  "erase.title": "Odeeffannoo koo haqi",  // draft – needs native review
  "erase.hint": "Waan sirnichi waa'ee keessan kuusu hundi akka haqamu gaafachuu dandeessu. Bulchaan dura gaafficha ni mirkaneessa. Lakkoofsonni maqaa malee (fkn. qorannoon suuraa meeqa dhukkuba argate) ni kuufamu.",  // draft – needs native review
  "erase.reason": "Sababa (filannoo)",  // draft – needs native review
  "erase.request": "Odeeffannoon koo akka haqamu gaafadhu",  // draft – needs native review
  "erase.confirm": "Erga bulchaan raggaasisee booda qonni keessan, gaaffiiwwan, akeekkachiisaa fi suuraan keessan ni haqamu; herregni keessanis ni cufama. Kun deebi'uu hin danda'u.",  // draft – needs native review
  "erase.pending": "Haquun gaafatameera",  // draft – needs native review
  "erase.since": "{date} irraa kaasee bulchaa eegaa jira.",  // draft – needs native review
  "erase.cancel": "Gaaffii haqi",  // draft – needs native review
  "erase.rejected": "Gaaffiin keessan inni dhumaa hin raggaafamne: {note}",  // draft – needs native review
  "erase.legalDraft": "Barreeffama qophii, gamaaggama seeraa eegaa jira (Labsii Eegumsa Odeeffannoo Dhuunfaa 1321/2024).",  // draft – needs native review
  "erase.adminDescription": "Gaaffii namoota odeeffannoon isaanii akka haqamu barbaadanii. Raggaasisuun qonna, gaaffii, akeekkachiisaa fi suuraa isaanii haqa; herrega isaanii battalumatti maqaa malee godha.",  // draft – needs native review
  "erase.status.pending": "Eegaa jira",  // draft – needs native review
  "erase.status.approved": "Raggaafame",  // draft – needs native review
  "erase.status.rejected": "Didame",  // draft – needs native review
  "erase.status.cancelled": "Haqame",  // draft – needs native review
  "erase.none": "Asitti gaaffiin hin jiru.",  // draft – needs native review
  "erase.note": "Yaadannoo (fkn. gaafficha akkamitti akka mirkaneessitan)",  // draft – needs native review
  "erase.approve": "Raggaasisii haqi",  // draft – needs native review
  "erase.reject": "Didi",  // draft – needs native review
  "erase.approveConfirm": "Odeeffannoon {name} amma haa haqamu? Kun deebi'uu hin danda'u.",  // draft – needs native review

  // ── Agronomist review ─────────────────────────────────────────────────────
  "nav.review": "Gamaaggama qabiyyee",  // draft – needs native review
  "role.agronomist": "Ogeessa qonnaa / gamaaggamaa qabiyyee",  // draft – needs native review
  "role.agronomist.desc": "Gamaaggamaa qabiyyee. Gaaffii DA'n dabarse ni deebisa, kuusaa beekumsaa, pirotokoolii, kaalaandarii midhaanii fi gabatee hammaa ni eega, suuraa leenjii irra deebiitiif ni mallatteessa, hiikkaa ni raggaasisa.",  // draft – needs native review
  "perm.content_review": "Qabiyyee gorsaa gamaaggamuu",  // draft – needs native review
  "perm.content_review.desc": "Gaaffii dabarfame deebisuu, gabatee pirotokoolii / kaalaandarii / hammaa sirreessuu, suuraa mallatteessuu, hiikkaa raggaasisuu.",  // draft – needs native review
  "review.description": "Gaaffii DA'n deebisuu hin dandeenye, gabatee qabiyyee gorsaa, mallattoo suuraa leenjii irra deebiitiif, fi raggaasisa hiikkaa.",  // draft – needs native review
  "review.tab.queue": "Gaaffii dabarfame",  // draft – needs native review
  "review.tab.content": "Gabatee qabiyyee",  // draft – needs native review
  "review.tab.labels": "Mallattoo suuraa",  // draft – needs native review
  "review.tab.translations": "Hiikkaa",  // draft – needs native review
  "review.queueEmpty": "Gaaffiin dabarfame hin jiru.",  // draft – needs native review
  "review.daNote": "Yaadannoo DA",  // draft – needs native review
  "review.promote": "Deebii kana kuusaa beekumsaattis dabali",  // draft – needs native review
  "review.kbQuestion": "Gaafficha jecha waliigalaan",  // draft – needs native review
  "review.kbQuestionHint": "Maqaa, lakkoofsa bilbilaa ykn bakka hin barreessinaa. Gorsaan akka deebii ogeessaan gamaaggamameetti ni caqasa.",  // draft – needs native review
  "review.contentHint": "Gabatee buufadhaa, sheetii keessatti sirreessaa, irra deebi'aa olkaa'aa. Toorri hundi ni sakatta'ama; toorri madda hin qabne akka hin mirkanoofnetti hafa.",  // draft – needs native review
  "review.table.calendar": "Seerota kaalaandarii midhaanii",  // draft – needs native review
  "review.table.protocols": "Pirotokoolii yaalii",  // draft – needs native review
  "review.table.dosage": "Seerota hammaa",  // draft – needs native review
  "review.download": "CSV buufadhu",  // draft – needs native review
  "review.upload": "CSV olkaa'i",  // draft – needs native review
  "review.uploaded": "Toora {n} olkaa'ameera ({p} ammas akka hin mirkanoofnetti mallattaa'aniiru).",  // draft – needs native review
  "review.labelsHint": "Qorannoo suuraa qorannoon DA kan moodeelaa irraa adda ta'e. Mallattoo sirrii mirkaneessaa; mallattoon moodelicha irra deebi'anii leenjisuuf ni ergama.",  // draft – needs native review
  "review.exportLabels": "Mallattoo baasi",  // draft – needs native review
  "review.noCorrections": "Ammaaf qorannoon suuraa sirreeffame hin jiru.",  // draft – needs native review
  "review.model": "Moodeela",  // draft – needs native review
  "review.da": "DA",  // draft – needs native review
  "review.label": "Mallattoo",  // draft – needs native review
  "review.saveLabel": "Mallattoo olkaa'i",  // draft – needs native review
  "review.labelled": "Mallattaa'eera",  // draft – needs native review
  "review.translationsHint": "Hiikkaa tokkoon tokkoon raggaasisaa ykn barreeffama caalu yaada kennaa. Yaadni kenname misoomsitootaaf faayilota keessa akka galchaniif ni ergama.",  // draft – needs native review
  "review.exportReviews": "Gamaaggama baasi",  // draft – needs native review
  "review.source": "Barreeffamoota",  // draft – needs native review
  "review.sourceUi": "Fuulota",  // draft – needs native review
  "review.sourceAdvisory": "Ergaa gorsaa",  // draft – needs native review
  "review.search": "Barbaadi",  // draft – needs native review
  "review.onlyOpen": "Kan hin gamaaggamamne qofa",  // draft – needs native review
  "review.count": "Barreeffama {n}",  // draft – needs native review
  "review.approved": "Raggaafame",  // draft – needs native review
  "review.changes": "Jijjiirraan yaadame",  // draft – needs native review
  "review.approve": "Raggaasisi",  // draft – needs native review
  "review.suggest": "Jijjiirraa yaadi",  // draft – needs native review
  "review.saveSuggestion": "Yaada olkaa'i",  // draft – needs native review

  // ── Agro-dealer shops ─────────────────────────────────────────────────────
  "nav.dealer": "Suuqii koo",  // draft – needs native review
  "role.agro_dealer": "Daldalaa galtee qonnaa (suuqii)",  // draft – needs native review
  "role.agro_dealer.desc": "Hojjetaa suuqii galtee daldalaa xixiqqaa. Odeeffannoo suuqii fi oomishaalee jiran ni eega, yeroo gurgurtaa koodii oomishaa ni mirkaneessa.",  // draft – needs native review
  "perm.dealer_manage": "Suuqii ofii bulchuu",  // draft – needs native review
  "perm.dealer_manage.desc": "Odeeffannoo suuqii fi oomishaalee jiran eeguu, yeroo gurguru koodii oomishaa mirkaneessuu.",  // draft – needs native review
  "dealer.description": "Bakka fi bilbila suuqii keessanii, oomishaalee galmaa'an kan gurgurtan, fi mirkaneessa koodii gurgurtaa dura.",  // draft – needs native review
  "dealer.notVerified": "Ammaaf hin mirkanoofne",  // draft – needs native review
  "dealer.badgeHint": "Bulchaan erga suuqicha mirkaneessee booda mallattoo gurgurtaa mirkanaa'e ni kenna. Qonnaan bultootaaf kan mul'atan suuqiiwwan mirkanaa'an qofa.",  // draft – needs native review
  "dealer.phone": "Bilbila suuqii",  // draft – needs native review
  "dealer.products": "Oomishaalee ani gurguru",  // draft – needs native review
  "dealer.productsHint": "Oomishaalee galmaa'an qofa. Yeroo dhumatu \"kuusaa keessa jira\" cufaa, akka qonnaan bultoonni gara keessan hin ergamneef.",  // draft – needs native review
  "dealer.inStock": "Kuusaa keessa jira",  // draft – needs native review
  "dealer.check": "Osoo hin gurgurin dura paakeejii mirkaneessaa",  // draft – needs native review
  "dealer.checkHint": "Koodii paakeejii irra jiru barreessaa ykn sakatta'aa. Mirkaneessichi suuqii keessaniif ni galmaa'a.",  // draft – needs native review
  "shops.title": "Suuqiiwwan mirkanaa'an isin bira jiran",  // draft – needs native review
  "shops.withProduct": "Suuqiiwwan mirkanaa'an oomisha kana qaban",  // draft – needs native review
  "shops.hint": "Suuqiiwwan mallattoo gurgurtaa mirkanaa'e qaban, dhiyeenyaan tarreeffaman. Tartiibni fageenya qofaan; suuqiin tokkollee dursuuf hin kaffalu.",  // draft – needs native review
  "shops.none": "Ammaaf suuqiin mirkanaa'e hin argamne.",  // draft – needs native review
  "shops.badge": "Gurgurtaa mirkanaa'e",  // draft – needs native review
  "orgs.type": "Gosa",  // draft – needs native review
  "orgs.type.supplier": "Dhiyeessaa galtee",  // draft – needs native review
  "orgs.type.agro_dealer": "Suuqii galtee qonnaa",  // draft – needs native review
  "orgs.type.abc": "Dhaabbata daldala qonnaa qonnaan bultootaa (ABC)",  // draft – needs native review
  "orgs.type.commercial_farm": "Qonna daldalaa",  // draft – needs native review
  "orgs.type.ngo": "Dhaabbata miti-mootummaa / pirojektii",  // draft – needs native review

  // ── Demand and supply outlook ─────────────────────────────────────────────
  "demand.title": "Fedhii godinaan",  // draft – needs native review
  "demand.hint": "Guyyoota 90 darban: qorannoo suuraa dhukkuboota oomishaaleen keessan xiyyeeffatan argate, fi qonna midhaan isaaniif qophaa'an oomishu. Kaartaan akeekkachiisa koodii oomishaalee keessanii (soba ta'uu danda'u) illee ni agarsiisa; ibsa isaa ilaalaa.",  // draft – needs native review
  "demand.checks": "Qorannoo suuraa",  // draft – needs native review
  "demand.warnings": "Akeekkachiisa koodii",  // draft – needs native review
  "outlook.title": "Tilmaama galfannaa godinaan",  // draft – needs native review
  "outlook.hint": "Waqtiiwwan midhaanii qonnaan bultoonni galmeessan irraa: qonni meeqa midhaan sana akka oomishu fi yoom galfachuuf akka eegan. Hammi oomishaa hin tilmaamamu.",  // draft – needs native review
  "outlook.allCrops": "Midhaan hunda",  // draft – needs native review
  "outlook.farms": "Qonnawwan",  // draft – needs native review
  "outlook.area": "Bal'ina",  // draft – needs native review
  "outlook.harvest": "Galfannaa eegamu",  // draft – needs native review
  "outlook.hidden": "dhokfameera (qonna 5 gadi)",  // draft – needs native review
  "outlook.unknown": "hin beekamu",  // draft – needs native review
  "outlook.estimated": "Ji'oonni tokko tokko kaalaandarii midhaanii ministeeraa irraa tilmaamaman.",  // draft – needs native review
  "outlook.none": "Midhaan kanaaf ammaaf waqtiin midhaanii galmaa'e hin jiru.",  // draft – needs native review

  // ── ABC and buy requests ──────────────────────────────────────────────────
  "nav.abc": "ABC koo",  // draft – needs native review
  "role.abc_manager": "Hoji gaggeessaa ABC",  // draft – needs native review
  "role.abc_manager.desc": "Hoji gaggeessaa dhaabbata daldala qonnaa qonnaan bultootaa (ABC). Miseensota fudhatan waliin hojjeta: gumaacha, karoora midhaanii, ergaa fi gaaffii bittootaa.",  // draft – needs native review
  "perm.abc_manage": "ABC ofii bulchuu",  // draft – needs native review
  "perm.abc_manage.desc": "Qonnaan bultoota affeeruu, gumaacha galmeessuu, galtee fi galfannaa karoorsuu, miseensotaaf ergaa erguu, bittootaaf deebisuu.",  // draft – needs native review
  "perm.trade_request": "Gaaffii bittaa maxxansuu",  // draft – needs native review
  "perm.trade_request.desc": "ABCwwan midhaan fi hamma gaafachuu, deebii isaanii dubbisuu.",  // draft – needs native review
  "abc.description": "Qonnaa fi midhaan miseensota keessanii, gumaacha isaanii, karoora galtee fi galfannaa, ergaa miseensotaaf fi gaaffii bittootaa.",  // draft – needs native review
  "abc.report": "Gabaasa ATI'f (CSV)",  // draft – needs native review
  "abc.members": "Miseensota",  // draft – needs native review
  "abc.invited": "Fudhachuu eegaa jiran",  // draft – needs native review
  "abc.area": "Bal'ina amma oomishamaa jiru",  // draft – needs native review
  "abc.contributions": "Galmee gumaachaa",  // draft – needs native review
  "abc.tab.members": "Miseensota",  // draft – needs native review
  "abc.tab.contributions": "Gumaacha",  // draft – needs native review
  "abc.tab.planning": "Karoora",  // draft – needs native review
  "abc.tab.messages": "Ergaa",  // draft – needs native review
  "abc.tab.buyers": "Bittoota",  // draft – needs native review
  "abc.membersHint": "Qonnaan bultoota galmaa'an bilbilaan affeeraa. Qonnii fi midhaan qonnaan bulaa ABC'f kan mul'atu erga appii isaanii irratti fudhatanii booda qofa.",  // draft – needs native review
  "abc.invitePhone": "Lakkoofsa bilbila qonnaan bulaa",  // draft – needs native review
  "abc.invite": "Affeeri",  // draft – needs native review
  "abc.invitedOk": "Affeerraan ergameera. Qonnaan bulaan Piroofaayilii koo keessatti ni fudhata.",  // draft – needs native review
  "abc.noMembers": "Ammaaf miseensi hin jiru.",  // draft – needs native review
  "abc.waiting": "Eegaa jira",  // draft – needs native review
  "abc.contributionsNote": "Gumaacha qooddattootaa (lafa, horii, humna). Galmee ABC'n qabu, sanada seeraa miti.",  // draft – needs native review
  "abc.kind.land": "Lafa",  // draft – needs native review
  "abc.kind.livestock": "Horii",  // draft – needs native review
  "abc.kind.labour": "Humna",  // draft – needs native review
  "abc.quantity": "Hamma",  // draft – needs native review
  "abc.unit": "Safartuu",  // draft – needs native review
  "abc.add": "Dabali",  // draft – needs native review
  "abc.byStage": "Midhaan miseensotaa sadarkaan",  // draft – needs native review
  "abc.upcoming": "Sadarkaalee torbaanota 3 itti aanan keessatti jalqaban",  // draft – needs native review
  "abc.upcomingHint": "Galtee fi humna dursaa karoorsaa: qonna fi bal'ina dhiyootti sadarkaa tokkoon tokkootti galan.",  // draft – needs native review
  "abc.quantitiesNote": "Hammi galtee ammaaf hin shallagamne; hamma mirkanaa'e ministeeraa barbaada. Hojjetaa misoomaa keessan gaafadhaa.",  // draft – needs native review
  "abc.messagesHint": "Miseensota keessan {n}f ergaa ergaa. Miseensonni akeekkachiisa cufan hin argatan; daangaan torbanii ni hojjeta.",  // draft – needs native review
  "abc.send": "Miseensotaaf ergi",  // draft – needs native review
  "abc.sent": "Miseensota {n}f ergameera ({skipped} hin ergamne: akeekkachiisni cufaa ykn daangaan torbanii ga'eera).",  // draft – needs native review
  "abc.buyersHint": "Gaaffii bittaa banaa daldaltoota irraa naannoo keessaniif. Deebiin keessan maqaa fi bilbila ABC keessanii waliin daldalaa ga'a.",  // draft – needs native review
  "abc.noBuyers": "Gaaffiin bittaa banaa hin jiru.",  // draft – needs native review
  "abc.answered": "Deebifame",  // draft – needs native review
  "abc.answerPlaceholder": "Dhiyeessii keessan (hamma, yoom, yaada gatii)",  // draft – needs native review
  "abcInv.title": "ABC koo",  // draft – needs native review
  "abcInv.hint": "Dhaabbilee daldala qonnaa qonnaan bultootaa isin affeeran. Yoo fudhattan, ABC'n qonna fi waqtii midhaanii keessan arguu danda'a.",  // draft – needs native review
  "abcInv.accept": "Fudhadhu",  // draft – needs native review
  "abcInv.decline": "Didi",  // draft – needs native review
  "abcInv.member": "Miseensa",  // draft – needs native review
  "abcInv.leave": "Ba'i",  // draft – needs native review
  "buy.title": "Gaaffii bittaa ABCwwaniif",  // draft – needs native review
  "buy.hint": "Dhaabbilee daldala qonnaa qonnaan bultootaatiif waan bituu barbaaddan himaa. ABCwwan naannichaa qunnamtii isaanii waliin asitti ni deebisu.",  // draft – needs native review
  "buy.quantity": "Hamma (kuntaala)",  // draft – needs native review
  "buy.anyRegion": "Naannoo kamiyyuu",  // draft – needs native review
  "buy.neededBy": "Guyyaa barbaachisu",  // draft – needs native review
  "buy.post": "Gaaffii maxxansi",  // draft – needs native review
  "buy.note": "Yaadannoo (qulqullina, bakka geessuu…)",  // draft – needs native review
  "buy.none": "Ammaaf gaaffii tokkollee hin maxxansine.",  // draft – needs native review
  "buy.open": "Banaa",  // draft – needs native review
  "buy.closed": "Cufame",  // draft – needs native review
  "buy.noAnswers": "Ammaaf deebiin hin jiru.",  // draft – needs native review
  "abc.descField": "Ibsa",  // draft – needs native review

  // ── Commercial farm ───────────────────────────────────────────────────────
  "nav.estate": "Qonna koo (daldalaa)",  // draft – needs native review
  "role.farm_manager": "Hoji gaggeessaa qonna daldalaa",  // draft – needs native review
  "role.farm_manager.desc": "Hoji gaggeessaa ykn ogeessa qonnaa qonna daldalaa. Bilookii qonnichaa, galmee sakatta'insaa fi karoora galfannaa ni eega.",  // draft – needs native review
  "perm.estate_manage": "Qonna daldalaa ofii bulchuu",  // draft – needs native review
  "perm.estate_manage.desc": "Bilookii dabaluu, sakatta'insa galmeessuu, akeekkachiisa dhukkubaa bilookii bira jiru arguu, karoora galfannaa baasuu.",  // draft – needs native review
  "estate.description": "Bilookii qonna keessanii sadarkaa midhaanii fi galfannaa eegamu waliin, galmee sakatta'insaa, fi akeekkachiisa dhukkubaa sakatta'insaa fi gabaasa bilookii tokkoon tokkoo bira jiru irraa.",  // draft – needs native review
  "estate.addBlock": "Bilookii dabali",  // draft – needs native review
  "estate.blocks": "Bilookii",  // draft – needs native review
  "estate.block": "Bilookii",  // draft – needs native review
  "estate.area": "Bal'ina midhaan irra jiru",  // draft – needs native review
  "estate.alerts": "Akeekkachiisa dhukkubaa",  // draft – needs native review
  "estate.alertScouting": "sakatta'insi {disease} argate ({severity})",  // draft – needs native review
  "estate.alertNearby": "{disease} qonna {farms} bilookii kana bira jiran irratti gabaafame (kan dhihoo {km} km)",  // draft – needs native review
  "estate.noBlocks": "Ammaaf bilookiin hin jiru. Lafa qonnaa keessan isa jalqabaa dabalaa.",  // draft – needs native review
  "estate.lastScouting": "Sakatta'insa dhumaa",  // draft – needs native review
  "estate.scout": "Sakatta'insa galmeessi",  // draft – needs native review
  "estate.estimated": "kaalaandarii midhaanii irraa tilmaamame",  // draft – needs native review
  "estate.team": "Garee qonnaa",  // draft – needs native review
  "estate.teamHint": "Herregni gareen bulchaadhaan dabalama (fuula Dhaabbilee).",  // draft – needs native review
  "estate.statusLabel": "Haala",  // draft – needs native review
  "estate.status.active": "Guddachaa jira",  // draft – needs native review
  "estate.status.harvested": "Galfatameera",  // draft – needs native review
  "estate.status.fallow": "Boonaa",  // draft – needs native review
  "estate.severity": "Maal argattan?",  // draft – needs native review
  "estate.sev.none": "Homaa",  // draft – needs native review
  "estate.sev.low": "Gadi aanaa",  // draft – needs native review
  "estate.sev.medium": "Giddu-galeessa",  // draft – needs native review
  "estate.sev.high": "Ol'aanaa",  // draft – needs native review
  "estate.disease": "Dhukkuba",  // draft – needs native review
  "estate.incidence": "Biqiltoota miidhaman (%)",  // draft – needs native review
  "estate.note": "Yaadannoo",  // draft – needs native review

  // ── Regulator ─────────────────────────────────────────────────────────────
  "nav.regulator": "To'ataa (EAA)",  // draft – needs native review
  "role.regulator": "To'ataa (EAA)",  // draft – needs native review
  "role.regulator.desc": "Hojjetaa to'ataa (EAA). Tarree oomishaalee galmaa'anii ifaa galcha, gabaasa oomisha sobaa fi kenninsa koodii sadarkaa biyyaatti arga.",  // draft – needs native review
  "perm.registry_manage": "Oomishaalee galmaa'an to'achuu",  // draft – needs native review
  "perm.registry_manage.desc": "Tarree oomishaalee ifaa galchuu, kaartaa oomisha sobaa biyyaalessaa fi kenninsa koodii dhiyeessitootaa arguu.",  // draft – needs native review
  "regulator.description": "Tarree oomishaalee galmaa'an kan sirnichi itti fayyadamu, bakka mirkaneessi koodii itti kufu ykn sobni itti gabaafamu, fi dhiyeessaan tokkoon tokkoon koodii meeqa akka kennu.",  // draft – needs native review
  "regulator.tab.registry": "Oomishaalee galmaa'an",  // draft – needs native review
  "regulator.tab.counterfeits": "Kaartaa oomisha sobaa",  // draft – needs native review
  "regulator.tab.issuance": "Kenninsa koodii",  // draft – needs native review
  "regulator.registryHint": "Tarree ifaa CSV'n galchaa (kutaalee kan buufamu waliin tokko). Oomishaaleen ni dabalamu ykn ni haaromfamu, gonkumaa hin haqaman; tooronni kan mirkanaa'an jedhaman yoo faayilichi jedhe qofa.",  // draft – needs native review
  "regulator.import": "Tarree ifaa galchi",  // draft – needs native review
  "regulator.summary": "Oomishaalee {total}: {registered} galmaa'an, {banned} dhorkaman; {placeholder} ammaaf tarree ifaa waliin hin mirkanoofne.",  // draft – needs native review
  "regulator.status.registered": "Galmaa'e",  // draft – needs native review
  "regulator.status.banned": "Dhorkame",  // draft – needs native review
  "regulator.status.expired": "Yeroon darbe",  // draft – needs native review
  "regulator.notVerified": "Hin mirkanoofne",  // draft – needs native review
  "regulator.counterfeitsHint": "Guyyoota {n} darban: mirkaneessa koodii kufe {warnings} fi gabaasa soba shakkame {fakes}, aanaadhaan.",  // draft – needs native review
  "regulator.warningsLegend": "Mirkaneessa kufe fi gabaasa sobaa",  // draft – needs native review
  "regulator.fakeReports": "Gabaasa sobaa",  // draft – needs native review
  "regulator.noCounterfeits": "Yeroo kana keessatti mirkaneessi kufe ykn gabaasni sobaa hin jiru.",  // draft – needs native review
  "regulator.issuanceHint": "Dhiyeessaadhaan: oomishaalee tarreeffaman, garee koodii, paakeejii uwwifaman, mirkaneessa, akeekkachiisa fi deebisuu.",  // draft – needs native review

  // ── NGO projects ──────────────────────────────────────────────────────────
  "nav.ngo": "Pirojektiiwwan NGO",  // draft – needs native review
  "role.ngo_staff": "Hojjetaa NGO / pirojektii",  // draft – needs native review
  "role.ngo_staff.desc": "Hojjetaa NGO ykn pirojektii misoomaa. Aanaalee filataman keessatti pirojektiiwwan ni gaggeessa: ergaa gorsaa qonnaan bultoota achiitiif fi gabaasa bu'aa walitti qabame.",  // draft – needs native review
  "perm.ngo_manage": "Pirojektiiwwan NGO gaggeessuu",  // draft – needs native review
  "perm.ngo_manage.desc": "Pirojektii uumuu, aanaalee isaanii filachuu, ergaa gorsaa achitti erguu fi bu'aa walitti qabame arguu.",  // draft – needs native review
  "ngo.description": "Pirojektiiwwan keessan, aanaalee uwwisan, ergaa gorsaa qonnaan bultoota achiitiif, fi bu'aa erga pirojektiin tokkoon tokkoon jalqabee. Ida'ama qofatu mul'ata, qonnaan bultoonni tokko tokkoon gonkumaa hin mul'atan.",  // draft – needs native review
  "ngo.new": "Pirojektii haaraa",  // draft – needs native review
  "ngo.start": "Guyyaa jalqabaa",  // draft – needs native review
  "ngo.none": "Ammaaf pirojektiin hin jiru.",  // draft – needs native review
  "ngo.since": "{date} irraa kaasee",  // draft – needs native review
  "ngo.areas": "Aanaalee pirojektichaa",  // draft – needs native review
  "ngo.noAreas": "Aanaalee pirojektiin kun uwwisu dabalaa.",  // draft – needs native review
  "ngo.addArea": "Aanaa dabali",  // draft – needs native review
  "ngo.message": "Ergaa gorsaa qonnaan bultoota aanaalee kanaatiif",  // draft – needs native review
  "ngo.messageHint": "Kan argatan qonnaan bultoota akeekkachiisa hayyaman qofa; daangaan torbanii ni hojjeta.",  // draft – needs native review
  "ngo.sent": "Qonnaan bultoota naannoo sanaa {total} keessaa {sent}f ergameera.",  // draft – needs native review
  "ngo.impact": "Bu'aa jalqabaa as",  // draft – needs native review
  "ngo.improved": "Hordoffii: fooyya'e",  // draft – needs native review

  // ── Lenders (credit profile with consent) ─────────────────────────────────
  "nav.lender": "Gaaffii liqii",  // draft – needs native review
  "role.lender": "Hojjetaa baankii / MFI",  // draft – needs native review
  "role.lender.desc": "Hojjetaa baankii ykn maaykiroofaayinaansii. Qonnaan bultoonni odeeffannoo liqii isaanii akka qooddatan gaafata; gabaasa qonnaan bulaa kan argu erga qonnaan bulaan appii keessatti hayyamee booda qofa.",  // draft – needs native review
  "perm.credit_request": "Odeeffannoo liqii qonnaan bulaa gaafachuu",  // draft – needs native review
  "perm.credit_request.desc": "Qonnaan bulaan odeeffannoo liqii isaa akka qooddatu gaafachuu, fi hayyamni hanga jirutti gabaasa dubbisuu.",  // draft – needs native review
  "credit.description": "Qonnaan bulaan odeeffannoo liqii isaa akka qooddatu gaafadhaa. Hanga qonnaan bulaan appii isaa keessatti hayyamutti homaa hin argitan. Hayyamni guyyaa 30 tura; qonnaan bulaan yeroo kamiyyuu kaasuu danda'a.",  // draft – needs native review
  "credit.new": "Gaaffii haaraa",  // draft – needs native review
  "credit.newHint": "Lakkoofsa bilbilaa qonnaan bulaa fi sababa gaaftaniif galchaa. Qonnaan bulaan maqaa keessan fi sababa kana ni arga.",  // draft – needs native review
  "credit.phone": "Bilbila qonnaan bulaa",  // draft – needs native review
  "credit.purpose": "Sababa (fkn: liqii galtee waqtii meheraaf)",  // draft – needs native review
  "credit.send": "Gaaffii ergi",  // draft – needs native review
  "credit.sent": "Ergameera. Lakkoofsi kun kan qonnaan bulaa galmaa'e yoo ta'e, gaaffii keessan appii isaa keessatti ni arga.",  // draft – needs native review
  "credit.mine": "Gaaffiiwwan koo",  // draft – needs native review
  "credit.none": "Ammaaf gaaffiin hin jiru.",  // draft – needs native review
  "credit.status.not_shared": "Hin qoodamne",  // draft – needs native review
  "credit.status.pending": "Eegaa jira",  // draft – needs native review
  "credit.status.declined": "Didame",  // draft – needs native review
  "credit.status.approved": "Qoodame",  // draft – needs native review
  "credit.status.expired": "Xumurame",  // draft – needs native review
  "credit.status.revoked": "Kaafame",  // draft – needs native review
  "credit.open": "Gabaasa bani",  // draft – needs native review
  "credit.hide": "Gabaasa dhoksi",  // draft – needs native review
  "credit.privacy": "\"Hin qoodamne\" jechuun qonnaan bulaan hin deebisne, dide, ykn lakkoofsi hin galmoofne ta'uu danda'a. Gabaasni isin bantan hundi galmee odiitii keessatti galmaa'a.",  // draft – needs native review
  "credit.score": "Qabxii {score} / 100",  // draft – needs native review
  "credit.farms": "Lafa qonnaa {count}, hektaara {area}. Midhaan: {crops}",  // draft – needs native review
  "credit.validUntil": "Hanga {date}tti qoodame",  // draft – needs native review
  "credit.method": "Qabxii seeraan galmee qonnaan bulaa platformii irraa herregame (AI miti). Murtee liqii miti.",  // draft – needs native review
  "creditInv.title": "Gaaffii odeeffannoo liqii",  // draft – needs native review
  "creditInv.hint": "Baankiiwwan ykn dhaabbileen maaykiroofaayinaansii kunneen odeeffannoo liqii keessan (qabxii, lafa qonnaa fi midhaan, maqaa fi bilbila) arguuf gaafataniiru. Yoo hayyamtan guyyaa 30f arguu danda'u. Yeroo kamiyyuu kaasuu dandeessu.",  // draft – needs native review
  "creditInv.approve": "Qoodi",  // draft – needs native review
  "creditInv.sharedUntil": "Hanga {date}tti qoodame",  // draft – needs native review
  "creditInv.revoke": "Qooduu dhaabi",  // draft – needs native review

  // ── Offline mode ──────────────────────────────────────────────────────────
  "offline.offline": "Interneetii irraa alatti jirtu.",  // draft – needs native review
  "offline.savedCopy": "Odeeffannoo dhumaa bilbila kana irratti kuufame argaa jirtu.",  // draft – needs native review
  "offline.waiting": "{n} erguuf eegaa jiru. Hanga ergamanitti hin ba'inaa.",  // draft – needs native review
  "offline.sent": "{n} ergameera. Deebiin gorsaa keessa, bu'aan suuraa ammoo Fayyaa midhaanii keessa jira.",  // draft – needs native review
  "offline.notSent": "Hin ergamne: {message}",  // draft – needs native review
  "offline.dismiss": "Tole",  // draft – needs native review
  "offline.queuedQuestion": "Quunnamtiin hin jiru. Gaaffiin keessan bilbila kana irratti kuufameera; yeroo quunnamtiin deebi'u ni ergama.",  // draft – needs native review
  "offline.queuedPhoto": "Quunnamtiin hin jiru. Suuraan keessan bilbila kana irratti kuufameera; yeroo quunnamtiin deebi'u ni qoratama. Bu'aan gadii ni mul'ata.",  // draft – needs native review
  "offline.savedChecks": "Qorannoo suuraa dhiyoo bilbila kana irra jiru",  // draft – needs native review
  "offline.savedChecksHint": "Quunnamtii malee gorsa dubbisuu akka dandeessaniif asitti kuufame. Yeroo baatan ni haqama.",  // draft – needs native review
  "offline.noDisease": "Qorannoo suuraa",  // draft – needs native review
  "offline.open": "Bani",  // draft – needs native review

  // ── Training photo dataset ────────────────────────────────────────────────
  "consent.training": "Qorannoo dhukkubaa fooyyessuuf suuraan midhaan koo haa kuufamu",  // draft – needs native review
  "consent.trainingHint": "Suuraan keessan maqaa, bilbila ykn bakka malee kuufama; moodeela dhukkubaa leenjisuuf qofa oola. Kana yoo dhaabdan suuraan keessan kuusaa irraa ni haqama (moodeelli duraan isaaniin leenji'e jijjiiramuu hin danda'u).",  // draft – needs native review
  "consent.kind.training": "Suuraa leenjiif",  // draft – needs native review
  "signup.consentTraining": "Qorannoo dhukkubaa fooyyessuuf suuraan midhaan koo haa kuufamu (filannoo)",  // draft – needs native review
  "da.consentTrainingAsk": "Qonnaan bulaan suuraan midhaan isaa qorannoo dhukkubaa fooyyessuuf akka kuufamu ni hayyama",  // draft – needs native review
  "photo.fromGallery": "Gaalarii irraa filadhu",  // draft – needs native review
  "review.tab.dataset": "Kuusaa leenjii",  // draft – needs native review
  "dataset.description": "Suuraa midhaanii hayyama qonnaan bultootaatiin moodeela dhukkubaa irra deebiin leenjisuuf kuufaman. Maqaa, bilbila ykn qabxii GPS hin qabu; odeeffannoon suuraa ni haqama.",  // draft – needs native review
  "dataset.exportLabelled": "Kan maqaa qaban baasi (ZIP)",  // draft – needs native review
  "dataset.exportAll": "Hunda baasi (ZIP)",  // draft – needs native review
  "dataset.included": "Suuraa kuusaa keessa jiran",  // draft – needs native review
  "dataset.labelled": "Maqaa kan qaban",  // draft – needs native review
  "dataset.excluded": "Kan baafaman",  // draft – needs native review
  "dataset.farmers": "Qonnaan bultoota hayyaman",  // draft – needs native review
  "dataset.byModel": "Moodeelli kan jedhe",  // draft – needs native review
  "dataset.bySource": "Kan ittiin kaafame",  // draft – needs native review
  "dataset.filter.all": "Hunda",  // draft – needs native review
  "dataset.filter.unlabelled": "Maqaa hin qabne",  // draft – needs native review
  "dataset.filter.labelled": "Maqaa kan qaban",  // draft – needs native review
  "dataset.filter.excluded": "Kan baafaman",  // draft – needs native review
  "dataset.none": "Ammaaf suuraan asii hin jiru.",  // draft – needs native review
  "dataset.noneHint": "Suuraan kan dhufu yeroo qonnaan bultoonni hayyaman qorannoo suuraa godhanidha.",  // draft – needs native review
  "dataset.labelHint": "Maqaan leenjiif oolu kan keessan yoo kaa'attan, yoo hin taane mirkaneessa DA ti. Deebiin moodeelaa tilmaama qofa.",  // draft – needs native review
  "dataset.byAgronomist": "agroonoomistii",  // draft – needs native review
  "dataset.byDa": "DA",  // draft – needs native review
  "dataset.model": "Moodeela",  // draft – needs native review
  "dataset.reason": "Sababa (fkn: kan hin mul'anne)",  // draft – needs native review
  "dataset.exclude": "Baasi",  // draft – needs native review
  "dataset.include": "Irra deebi'ii galchi",  // draft – needs native review
  "dataset.pickLabel": "Maqaa sirrii filadhu",  // draft – needs native review
  "dataset.saveLabel": "Maqaa kuusi",  // draft – needs native review

  // ── Daily tips ────────────────────────────────────────────────────────────
  "nav.tips": "Gorsa guyyaa",  // draft – needs native review
  "tips.today": "Gorsa qonnaa har'aa",  // draft – needs native review
  "tips.from": "Gorsa dhiyoo, {date} irraa",  // draft – needs native review
  "tips.all": "Gorsa hunda",  // draft – needs native review
  "tips.description": "Gorsa qonnaa gaggabaabaa qajeelfama Ministeera Qonnaa irraa; osoo hin maxxanfamin dura agroonoomistiin mirkanaa'a.",  // draft – needs native review
  "tips.none": "Ammaaf gorsi maxxanfame hin jiru.",  // draft – needs native review
  "tips.englishOnly": "Afaan Ingiliziitiin mul'ate: hiikni ammallee hin qophoofne.",  // draft – needs native review
  "review.tab.tips": "Gorsa guyyaa",  // draft – needs native review
  "tips.reviewHint": "Ganama ganama sirnichi gorsa boruu qajeelfama MoA irraa (AI yoo hin jirre kaalaandarii midhaanii irraa) qopheessa. Hanga isin raggaasiftanitti homtuu hin maxxanfamu. Osoo hin raggaasisin dura afaan tokkoon tokkoon ilaalaa.",  // draft – needs native review
  "tips.drafted": "{date}f wixinee haaraa {n}.",  // draft – needs native review
  "tips.draftNow": "Amma gorsa qopheessi",  // draft – needs native review
  "tips.write": "Gorsa barreessi",  // draft – needs native review
  "tips.status.draft": "Gamaaggama eegaa jira",  // draft – needs native review
  "tips.status.approved": "Maxxanfame",  // draft – needs native review
  "tips.status.rejected": "Didame",  // draft – needs native review
  "tips.noneHere": "Asii homtuu hin jiru.",  // draft – needs native review
  "tips.origin.ai": "Wixinee AI",  // draft – needs native review
  "tips.origin.calendar": "Kaalaandarii midhaanii",  // draft – needs native review
  "tips.origin.expert": "Ogeessaan kan barreeffame",  // draft – needs native review
  "tips.national": "Biyya guutuu",  // draft – needs native review
  "tips.missingLangs": "Kan hir'ate: {langs}. Dubbistoonni kunneen barreeffama Ingiliziitiin argu.",  // draft – needs native review
  "tips.approve": "Raggaasisii maxxansi",  // draft – needs native review
  "tips.reject": "Didi",  // draft – needs native review
  "tips.edit": "Gulaali",  // draft – needs native review
  "tips.aud.all": "Hunda",  // draft – needs native review
  "tips.date": "Guyyaa",  // draft – needs native review
  "tips.region": "Koodii naannoo (duwwaa = biyya guutuu)",  // draft – needs native review
  "tips.audience": "Eenyutu arga",  // draft – needs native review
  "tips.title": "Mata duree",  // draft – needs native review
  "tips.text": "Barreeffama",  // draft – needs native review
  "tips.editorHint": "Waan qajeelfamni jedhu qofa barreessaa. Oomisha ykn hamma qoricha ilbiisotaa gonkumaa hin barreessinaa. Wixinee AI yoo gulaaltan mallattoo [S1] hin haqinaa. \"Kuusii maxxansi\" gorsicha battaluma hundaaf agarsiisa; \"Akka wixineetti kuusi\" gamaaggamaaf tursa.",  // draft – needs native review
  "tips.save": "Kuusi",  // draft – needs native review
  "tips.cancel": "Dhiisi",  // draft – needs native review

  // ── Sign-in demo accounts ─────────────────────────────────────────────────
  "signin.demoHint": "Naannoo dhiyeessaa namoota fi galmeewwan fakkeenyaa qabu. Seenuuf herrega tuqi.",  // draft – needs native review
  "signin.demoPassword": "Jecha darbii",  // draft – needs native review
  "signin.demo.pitchFarmer": "Qonnaan bulaa agarsiisaa, Dawaa Caffaa",  // draft – needs native review
  "signin.demo.farmerCases": "Qonnaan bulaa dhimma DA qabu",  // draft – needs native review
  "signin.demo.oromiaFarmer": "Qonnaan bulaa Oromiyaa (Afaan Oromoo)",  // draft – needs native review

  // ── Admin daily tips ──────────────────────────────────────────────────────
  "nav.adminTips": "Gorsa maxxansi",  // draft – needs native review
  "tips.adminDescription": "Gorsa barreessaatii qonnaan bultoota, DA fi fayyadamtoota biroof maxxansaa; ykn wixinee sirnichi ganama ganama qajeelfama MoA irraa qopheessu raggaasisaa.",  // draft – needs native review
  "tips.savePublish": "Kuusii maxxansi",  // draft – needs native review
  "tips.saveDraft": "Akka wixineetti kuusi",  // draft – needs native review
  "tips.manage": "Gorsa barreessi ykn raggaasisi",  // draft – needs native review

  // ── AI engine choice (Gemini / DeepSeek) ──────────────────────────────────
  "aikeys.engine.title": "Motora deebii barreeffamaa",  // draft – needs native review
  "aikeys.engine.description": "AI kamtu deebii gorsaa, gorsa guyyaa fi ibsa gaggabaabaa akka barreessu filadhaa. Seeronni hin jijjiiraman: deebiin qajeelfama qofa irraa, madda waliin, odeeffannoon dhuunfaa hin ergamu.",  // draft – needs native review
  "aikeys.engine.geminiHint": "Sagaleef fi barbaacha kuusaa beekumsaatiifis ni oola. Sadarkaa bilisaa qaba.",  // draft – needs native review
  "aikeys.engine.deepseekHint": "Barreeffama qofa; kaffaltii dursaatiin itti fayyadama irratti kaffalama. Odeeffannoon tajaajiltoota DeepSeek Chaayinaa keessa jiran irratti hojjetama; barreeffama maqaa malee kan Gemini argatu wal fakkaatu argata.",  // draft – needs native review
  "aikeys.engine.inUse": "Hojii irra jira",  // draft – needs native review
  "aikeys.engine.use": "Kana fayyadami",  // draft – needs native review
  "aikeys.engine.keys": "Furtuu hojjetu {n}",  // draft – needs native review
  "aikeys.engine.fallbackOn": "Motorri filatame yoo hin hojjenne, kan biraa furtuu hojjetu yoo qabaate ni deebisa (fuula qindaa'ina gorsaa irratti jijjiirama).",  // draft – needs native review
  "aikeys.engine.fallbackOff": "Gara motora biraatti jijjiiruun dhaabbateera (fuula qindaa'ina gorsaa).",  // draft – needs native review
  "aikeys.engine.geminiOnly": "Sagaleen fi barbaachi kuusaa beekumsaa yeroo hunda Gemini fayyadamu; kanaaf yoo xiqqaate furtuu Gemini tokko qabaadhaa.",  // draft – needs native review
  "aikeys.engine.saved": "Amma {name} deebii barreessa.",  // draft – needs native review
  "aikeys.engine.noKey": "{name} filatameera garuu ammallee furtuu hojjetu hin qabu. Furtuu dabalaa; hanga sanaatti jijjiirraan yoo banaa ta'e motorri biraa ni deebisa.",  // draft – needs native review
  "aikeys.providerKeys": "Furtuuwwan {name}",  // draft – needs native review
  "aikeys.provider": "Dhiyeessaa",  // draft – needs native review
  "aikeys.getGemini": "aistudio.google.com/apikey irratti furtuu uumaa. Furtuuwwan pirojektii Google adda addaa irraa daangaa adda addaa qabu.",  // draft – needs native review
  "aikeys.getDeepseek": "platform.deepseek.com (API keys) irratti furtuu uumaatii achumatti herrega guutaa. Furtuun herrega hin qabne ni darbama.",  // draft – needs native review
  "settings.llm_fallback": "Motorri AI filatame yoo hin hojjenne kan biraa fayyadami",  // draft – needs native review
  "settings.llm_fallback.hint": "Banaa: motorri filatame (Gemini ykn DeepSeek) furtuu ykn herrega yoo hin qabaanne ykn yoo cite, kan biraa furtuu hojjetu yoo qabaate ni deebisa. Motorri fuula furtuuwwan AI API irratti filatama.",  // draft – needs native review
  "settings.daily_tips_auto": "Ganama ganama gorsa guyyaa qopheessi",  // draft – needs native review
  "settings.daily_tips_auto.hint": "Banaa: ganama ganama sirnichi gorsa boruu gamaaggamaaf qopheessa. Hanga agroonoomistiin ykn bulchaan raggaasisutti homtuu hin maxxanfamu.",  // draft – needs native review
  "settings.daily_tips_per_day": "Gorsa guyyaatti qophaa'u",  // draft – needs native review
  "settings.daily_tips_per_day.hint": "Wixineen AI tokko gaaffii AI tokko fayyadama.",  // draft – needs native review

  // ── DeepSeek key list ─────────────────────────────────────────────────────
  "aikeys.noneHintDeepseek": "Hanga tokko dabaltanitti, DeepSeek DEEPSEEK_API_KEY faayilii .env tajaajilaa keessa jiru qofa fayyadamuu danda'a, yoo kaa'ame.",  // draft – needs native review

  // ── Sidebar groups ────────────────────────────────────────────────────────
  "nav.group.farming": "Qonna",  // draft – needs native review
  "nav.group.extension": "Hojii ekisteenshinii",  // draft – needs native review
  "nav.group.partners": "Seensa michootaa",  // draft – needs native review
  "nav.group.contentAi": "Qabiyyee fi AI",  // draft – needs native review
  "nav.group.system": "Sirna",  // draft – needs native review

  // ── Livestock prices ──────────────────────────────────────────────────────
  "nav.livestock": "Gatii horii",  // draft – needs native review
  "lv.description": "Gatii horii tokkoo gabaawwan horii NMIS gabaasan, tilmaama torban 4 fi hammam amanamaa akka ta'e waliin.",  // draft – needs native review
  "lv.animal": "Horii",  // draft – needs native review
  "lv.animal.ox": "Qotiyyoo",  // draft – needs native review
  "lv.animal.cow": "Sa'a",  // draft – needs native review
  "lv.animal.bull": "Korma",  // draft – needs native review
  "lv.animal.heifer": "Goromsa",  // draft – needs native review
  "lv.animal.calf": "Jabbii",  // draft – needs native review
  "lv.animal.sheep": "Hoolaa",  // draft – needs native review
  "lv.animal.goat": "Re'ee",  // draft – needs native review
  "lv.animal.camel": "Gaala",  // draft – needs native review
  "lv.animal.chicken": "Lukkuu",  // draft – needs native review
  "lv.sourceLine": "Madda: odeeffannoo gabaa horii NMIS, {start} hanga {end}.",  // draft – needs native review
  "lv.stat.reports": "Gabaasa gatii",  // draft – needs native review
  "lv.stat.markets": "Gabaawwan",  // draft – needs native review
  "lv.stat.period": "Yeroo odeeffannoo",  // draft – needs native review
  "lv.stat.days": "Guyyaa {n}",  // draft – needs native review
  "lv.empty.title": "Gatiin horii ammallee hin fe'amne",  // draft – needs native review
  "lv.empty.description": "Gabaasni gabaa horii NMIS yeroo galfamu gatiin as mul'ata.",  // draft – needs native review
  "lv.noSeries": "Filannoo kanaaf gabaasni hin jiru.",  // draft – needs native review
  "lv.outlook.title": "Tilmaama torban 4",  // draft – needs native review
  "lv.outlook.country": "Biyya guutuu, sadarkaa hunda waliin",  // draft – needs native review
  "lv.outlook.region": "{region}, sadarkaa hunda waliin",  // draft – needs native review
  "lv.outlook.countryFallback": "{region} keessatti gabaasni xiqqaa dha: tilmaama biyya guutuu",  // draft – needs native review
  "lv.outlook.up": "Gatiin gara {pct}% ol ka'uu danda'a",  // draft – needs native review
  "lv.outlook.down": "Gatiin gara {pct}% gadi bu'uu danda'a",  // draft – needs native review
  "lv.outlook.flat": "Gatiin baay'ee hin jijjiiramu",  // draft – needs native review
  "lv.outlook.range": "(tarii {low}% hanga {high}%)",  // draft – needs native review
  "lv.outlook.none": "Tilmaamni ammaaf hin jiru: adeemsa safaruuf odeeffannoon gahaa miti.",  // draft – needs native review
  "lv.outlook.why": "Maaliif amanamummaan kun",  // draft – needs native review
  "lv.outlook.note": "Sadarkaan tokkoon tokkoon gabaa irratti sadarkaa gatii mataa isaa qaba; moodeelli adeemsa waloo safara. Tilmaamni waadaa miti: osoo hin gurgurin dura gabaa irratti mirkaneeffadhaa.",  // draft – needs native review
  "lv.conf.high": "Amanamummaa ol aanaa",  // draft – needs native review
  "lv.conf.medium": "Amanamummaa giddu galeessaa",  // draft – needs native review
  "lv.conf.low": "Amanamummaa gadi aanaa",  // draft – needs native review
  "lv.reason.period": "Gabaasa gatii {reports} gabaa {markets} irraa, {start} hanga {end} irratti hundaa'e.",  // draft – needs native review
  "lv.reason.no_season": "Odeeffannoon waggaa tokkoo gadi waan ta'eef jijjiiramni waqtii (ayyaana, bona) moodeela keessa hin jiru.",  // draft – needs native review
  "lv.reason.few_reports": "Gabaasa {reports} qofa: guyyaan gabaa adda ta'e tokko bu'aa jijjiiruu danda'a.",  // draft – needs native review
  "lv.reason.short_period": "Odeeffannoo guyyaa {days} qofa: adeemsa jijjiirama yeroo gabaabaa irraa adda baasuuf baay'ee gabaabaa dha.",  // draft – needs native review
  "lv.reason.stale": "Gabaasni dhumaa guyyaa {days} dura kan ture.",  // draft – needs native review
  "lv.reason.checked": "Gabaasa dhiyoo hin argin irratti qoratame: giddugaleessaan {pct}% dogoggore ('jijjiiramni hin jiru' jedhanii tilmaamuun {naive}%).",  // draft – needs native review
  "lv.reason.no_trend": "Gabaasa dhiyoo irratti adeemsi ({pct}%) 'jijjiiramni hin jiru' ({naive}%) irra hin caalle, kanaaf tilmaamni 'baay'ee hin jijjiiramu' dha.",  // draft – needs native review
  "lv.reason.not_checked": "Moodeela odeeffannoo hin argin irratti qoruuf gabaasni dhiyoo baay'ee xiqqaa dha.",  // draft – needs native review
  "lv.reason.too_few": "Adeemsa arguuf gabaasni irra deddeebi'ame sadarkaa walfakkaataa gabaa tokko irratti gahaa miti.",  // draft – needs native review
  "lv.reason.no_data": "Horii kanaaf gabaasni fe'ame hin jiru.",  // draft – needs native review
  "lv.chart.title": "Gatii giddugaleessaa horii tokkoo",  // draft – needs native review
  "lv.chart.description": "Gidduu gatii gadi aanaa fi ol aanaa; sadarkaalee {n} dhiyeenya gabaafaman.",  // draft – needs native review
  "lv.table.title": "Gatii dhiyoo",  // draft – needs native review
  "lv.table.description": "Horii tokkoof, gatii gabaafame gadi aanaa hanga ol aanaa. Tilmaama: daangaa torban 4 gabaasa dhumaa booda eegamu.",  // draft – needs native review
  "lv.table.market": "Gabaa",  // draft – needs native review
  "lv.table.grade": "Sadarkaa",  // draft – needs native review
  "lv.table.latest": "Gatii dhiyoo",  // draft – needs native review
  "lv.table.date": "Kan gabaafame",  // draft – needs native review
  "lv.table.change": "Kan duraa irraa",  // draft – needs native review
  "lv.table.outlook": "Torban 4 keessatti",  // draft – needs native review
  "lv.import.title": "Gatii horii galchi",  // draft – needs native review
  "lv.import.description": "CSV gabaasa gatii horii NMIS fe'aa (tarree beekuuf unka buufadhaa). Gabaasni duraan fe'ame ni haaromfama, tilmaamnis irra deebi'ee leenji'a.",  // draft – needs native review
  "lv.import.template": "Unka buusi",  // draft – needs native review
  "lv.import.upload": "CSV fe'i",  // draft – needs native review
  "lv.import.retrain": "Tilmaama irra deebi'ii leenjisi",  // draft – needs native review
  "lv.import.result": "Gabaasa {added} dabalame, {updated} haaromfame, {rejected} didame; tilmaama {forecasts} leenji'e.",  // draft – needs native review
  "lv.import.trained": "Moodeelli {trained} irra deebi'anii leenji'an; {forecasts} tilmaamaaf odeeffannoo gahaa qabu.",  // draft – needs native review

  // ── Treatment value chain: dose, shops, pack check ───────────────────────
  "photo.p.forYourPlot": "Lafa keessaniif",  // draft – needs native review
  "photo.p.rateSource": "Hammam: {source}",  // draft – needs native review
  "photo.p.cited": "Hammam manuwaala MoA",  // draft – needs native review
  "photo.p.followLabel": "Asxaan qodaa irratti jiru isa xumuraa ti.",  // draft – needs native review
  "photo.shop.verified": "Gurgurtaa mirkanaa'e",  // draft – needs native review
  "photo.shop.samplePrice": "gatii fakkeenyaa",  // draft – needs native review
  "photo.shop.askPrice": "Gatii suuqii gaafadhaa",  // draft – needs native review
  "photo.shop.call": "Bilbilaa",  // draft – needs native review
  "photo.shop.none": "Suuqiin oomishaalee kana qabu sirna keessa ammallee hin jiru. Hojjetaa misoomaa ykn waldaa keessan gaafadhaa.",  // draft – needs native review
  "photo.checkPack": "Osoo hin facaasin dura qodaa mirkaneeffadhaa",  // draft – needs native review
  "photo.checkPackHint": "Koodii QR qodaa irratti jiru iskaanii godhaa ykn koodii barreessaa: appiin dhugaa ta'uu fi dhukkuba kanaaf oomisha sirrii ta'uu isaa isinitti hima.",  // draft – needs native review
  "verify.plan.match": "Kun oomishaalee karoora yaalii {disease} keessan irra jiran keessaa tokko.",  // draft – needs native review
  "verify.plan.matchButWarning": "Oomishni kun karoora yaalii {disease} keessan irra jira, garuu qodaan kun qorannoo hin darbine: hin fayyadaminaa. Qodaa biraa bitaatii irra deebi'aa mirkaneeffadhaa.",  // draft – needs native review
  "verify.plan.noMatch": "Oomishni kun karoora yaalii {disease} keessan irra hin jiru. Oomishaalee karoora irra jiran: {list}. Osoo hin fayyadamin dura hojjetaa misoomaa gaafadhaa.",  // draft – needs native review
  "verify.plan.for": "Qorannoo suuraa keessaniif qodaa mirkaneessaa jirtu: bu'aan karoora yaalii keessan irra jiraachuu isaas ni hima.",  // draft – needs native review
  "dealer.price": "Gatii qodaa tokkoo (qarshii)",  // draft – needs native review
  "dealer.pack": "Hamma qodaa",  // draft – needs native review
  "dealer.savePrice": "Gatii olkaa'i",  // draft – needs native review
  "dealer.sampleNote": "Gatii fakkeenyaa (agarsiisaaf): bakka buusuuf gatii mataa keessanii galchaa.",  // draft – needs native review
  "dealer.priceHint": "Yeroo appiin oomisha gorsu qonnaan bultoonni gatii kana guyyaa isaa waliin argu.",  // draft – needs native review

  // ── Map ─────────────────────────────────────────────────────────────────────
  "nav.map": "Kaartaa",  // draft – needs native review
  "map.description": "Bakkeewwan dhukkubaa, gatii gabaa, suuqiiwwan galtee fi lafa qonnaa kaartaa tokko irratti, daangaa naannoo, godinaa fi aanaa seera qabeessa waliin.",  // draft – needs native review
  "map.layers": "Sadarkaalee",  // draft – needs native review
  "map.layer.disease": "Bakkeewwan dhukkubaa",  // draft – needs native review
  "map.layer.markets": "Gabaawwan midhaanii fi gatii",  // draft – needs native review
  "map.layer.shops": "Suuqiiwwan galtee",  // draft – needs native review
  "map.layer.farms": "Lafa qonnaa",  // draft – needs native review
  "map.crop": "Midhaan gatiif",  // draft – needs native review
  "map.period": "Yeroo dhukkubaa",  // draft – needs native review
  "map.lastDays": "Guyyoota {n} darban",  // draft – needs native review
  "map.legend": "Ibsa mallattoo",  // draft – needs native review
  "map.scope": "Kan mul'atu: {area}",  // draft – needs native review
  "map.kebele": "Ganda: {kebele}",  // draft – needs native review
  "map.approxWoreda": "Giddu galeessa aanaa irratti mul'ata (tilmaamaan).",  // draft – needs native review
  "map.small": "Lakkoofsi 5 gadii <5 jedhamee mul'ata.",  // draft – needs native review
  "map.farms.mine": "Lafa koo",  // draft – needs native review
  "map.farms.visit": "Daawwannaa:",  // draft – needs native review
  "map.farms.count": "Qonnaan bultoota {farmers} · lafa {farms}",  // draft – needs native review
  "map.farms.hectares": "Hektaara {ha} galmaa'e",  // draft – needs native review
  "map.farms.legendCounts": "Lafa qonnaa: qonnaan bultoota aanaa tokkoon galmaa'an (qonnaan bulaan tokkollee adda hin mul'atu).",  // draft – needs native review
  "map.farms.legendDa": "Qonnaan bultoota isin waliin hojjetan (hayyama isaaniitiin). Diimaa: dursa daawwadhaa; burtukaanii: daawwannaa barbaada.",  // draft – needs native review
  "map.farms.legendOwn": "Lafa keessan (gurraacha diimaa).",  // draft – needs native review
  "map.markets.noPrice": "Gabaa kana irratti gatiin {crop} dhiyoo hin jiru.",  // draft – needs native review
  "map.markets.approx": "Bakki tilmaamaan: giddu galeessa naannoo irratti mul'ata.",  // draft – needs native review
  "map.markets.legend": "gatii daldalaa NMIS dhiyoo",  // draft – needs native review
  "map.shops.counterfeit": "Akeekkachiisa koodii {warnings} · gabaasa sobaa {fakes}",  // draft – needs native review
  "map.shops.noStock": "Oomishni galmaa'e kuusaa keessa hin jiru.",  // draft – needs native review
  "map.shops.legend": "Suuqii galtee (marsaa magariisa: gurgurtaa mirkanaa'e)",  // draft – needs native review
  "map.disease.scans": "Qorannoo suuraa {n}, isa dhumaa {date}",  // draft – needs native review
  "map.disease.note": "Aanaan lakkaa'ame; bakki lafa qonnaa gonkumaa hin mul'atu.",  // draft – needs native review
  "map.legend.dashed": "Sarara cita'aa: bakka tilmaamaa.",  // draft – needs native review

  // ── ABC company core (A1) ─────────────────────────────────────────────────
  "nav.abcRules": "Seerota ABC",  // draft – needs native review
  "abc.saved": "Olkaa'ameera.",  // draft – needs native review
  "abc.pickCompany": "Dhaabbata",  // draft – needs native review
  "abc.tab.company": "Dhaabbata",  // draft – needs native review
  "abc.role.organizing_committee": "Koree qindeessaa",  // draft – needs native review
  "abc.role.general_manager": "Hoji gaggeessaa olaanaa",  // draft – needs native review
  "abc.role.chair": "Itti gaafatamaa boordii",  // draft – needs native review
  "abc.role.board_member": "Miseensa boordii",  // draft – needs native review
  "abc.role.secretary": "Barreessaa",  // draft – needs native review
  "abc.role.accountant": "Herregaa",  // draft – needs native review
  "abc.role.store_keeper": "Eegduu kuusaa",  // draft – needs native review
  "abc.role.machinery_coordinator": "Qindeessaa maashinii",  // draft – needs native review
  "abc.role.agronomist": "Ogeessa qonnaa ABC",  // draft – needs native review
  "abc.role.auditor": "Odiitara",  // draft – needs native review
  "abc.rule.min_founding_members": "Miseensota hundeessitoota xiqqaa",  // draft – needs native review
  "abc.rule.share_value_min_etb": "Gatii aksiyoona tokkoo xiqqaa",  // draft – needs native review
  "abc.rule.min_shares_per_member": "Aksiyoona miseensa tokkoof xiqqaa",  // draft – needs native review
  "abc.rule.min_paid_capital_etb": "Kaappitaala kaffalame xiqqaa",  // draft – needs native review
  "abc.rule.registration_paid_fraction": "Galmee dura kan kaffalamu (kaappitaala labsame irraa)",  // draft – needs native review
  "abc.rule.pledge_upfront_fraction": "Yeroo waadaa galan kan kaffalamu (aksiyoona dabalataa)",  // draft – needs native review
  "abc.rule.pledge_deadline_years": "Yeroo aksiyoona waadaa galame kaffaluu",  // draft – needs native review
  "abc.rule.max_ownership_fraction": "Abbummaa miseensa tokkoo olaanaa",  // draft – needs native review
  "abc.rule.committee_min": "Koree qindeessaa: xiqqaa",  // draft – needs native review
  "abc.rule.committee_max": "Koree qindeessaa: olaanaa",  // draft – needs native review
  "abc.rule.business_plan_years_min": "Karoora daldalaa: waggoota xiqqaa",  // draft – needs native review
  "abc.rule.business_plan_years_max": "Karoora daldalaa: waggoota olaanaa",  // draft – needs native review
  "abc.rule.voting_land_factor": "Ulfaatina sagalee: qooda lafaa",  // draft – needs native review
  "abc.rule.voting_production_factor": "Ulfaatina sagalee: qooda oomishaa",  // draft – needs native review
  "abc.unit.members": "miseensota",  // draft – needs native review
  "abc.unit.shares": "aksiyoonota",  // draft – needs native review
  "abc.unit.years": "waggoota",  // draft – needs native review
  "abc.ruleVerified": "Mirkanaa'e",  // draft – needs native review
  "abc.rulePlatform": "Durtii waltajjii",  // draft – needs native review
  "abc.ruleDraft": "Wixinee: mirkaneessaa",  // draft – needs native review
  "abc.ruleSince": "{date} irraa",  // draft – needs native review
  "abc.since": "{date} irraa",  // draft – needs native review
  "abc.company.profile": "Ibsa dhaabbataa",  // draft – needs native review
  "abc.company.type": "Gosa ABC",  // draft – needs native review
  "abc.company.kebele": "Ganda",  // draft – needs native review
  "abc.company.fiscalYear": "Waggaan baajataa kan jalqabu",  // draft – needs native review
  "abc.company.declaredCapital": "Kaappitaala labsame (qarshii)",  // draft – needs native review
  "abc.company.approvalLimit": "Hayyama boordii kan barbaachisu (qarshii) ol",  // draft – needs native review
  "abc.company.approvalLimitHint": "Bittaa fi gurgurtaan hamma kanaa ol hayyama boordii barbaada.",  // draft – needs native review
  "abc.company.exitPolicy": "Imaammata ba'uu fi deebisuu miseensaa",  // draft – needs native review
  "abc.company.rules": "Seerota seeraa hojii irra jiran",  // draft – needs native review
  "abc.company.rulesHint": "Bulchaan seeraa fi qajeelfamoota irraa kan murteessu; wixineen mirkanaa'uu qabu.",  // draft – needs native review
  "abc.company.team": "Garee fi gahee",  // draft – needs native review
  "abc.company.teamHint": "Gaheen tokkoon tokkoon ABC kana keessatti mirga mataa isaa kenna. Namni tokko gahee hedduu, ABC biroo keessattis gahee qabaachuu danda'a.",  // draft – needs native review
  "abc.company.noTeam": "Gaheen ammallee hin kennamne.",  // draft – needs native review
  "abc.company.phone": "Bilbila",  // draft – needs native review
  "abc.company.role": "Gahee",  // draft – needs native review
  "abc.company.addRole": "Gahee kenni",  // draft – needs native review
  "abc.company.history": "Seenaa",  // draft – needs native review
  "abc.company.noHistory": "Jijjiiramni galmaa'e ammallee hin jiru.",  // draft – needs native review
  "abc.status.formation": "Hundeeffama irra",  // draft – needs native review
  "abc.status.registered": "Galmaa'e",  // draft – needs native review
  "abc.status.suspended": "Dhaabbate",  // draft – needs native review
  "abc.status.dissolved": "Diigame",  // draft – needs native review
  "abc.type.all": "Gosoota hunda",  // draft – needs native review
  "abc.type.crop_grain": "Midhaan / qonna",  // draft – needs native review
  "abc.type.horticulture": "Kuduraa",  // draft – needs native review
  "abc.type.fruit": "Fuduraa",  // draft – needs native review
  "abc.type.livestock": "Horii",  // draft – needs native review
  "abc.type.mixed": "Makaa",  // draft – needs native review
  "abc.fy.hamle": "Adoolessa 1 (bara baajata Itoophiyaa)",  // draft – needs native review
  "abc.fy.meskerem": "Fulbaana 1 (bara haaraa Itoophiyaa)",  // draft – needs native review
  "abc.fy.january": "Amajjii 1",  // draft – needs native review
  "abc.action.abc.profile.update": "Ibsi dhaabbataa jijjiirame",  // draft – needs native review
  "abc.action.abc.role.add": "Gaheen kenname",  // draft – needs native review
  "abc.action.abc.role.remove": "Gaheen kaafame",  // draft – needs native review
  "abc.rules.description": "Lakkoofsota seeraa ABCf (miseensota xiqqaa, gatii aksiyoonaa, daangaa abbummaa…). Gatii guyyaa tokko irraa madda isaa waliin jijjiiraa: gatiin durii akka seenaatti hafa.",  // draft – needs native review
  "abc.rules.all": "Seerota hunda fi seenaa isaanii",  // draft – needs native review
  "abc.rules.new": "Gatii haaraa",  // draft – needs native review
  "abc.rules.newHint": "Guyyaa kaa'tan irraa hojii irra oola. Seera, qajeelfama ykn murtee keewwata isaa waliin caqasaa.",  // draft – needs native review
  "abc.rules.rule": "Seera",  // draft – needs native review
  "abc.rules.value": "Gatii",  // draft – needs native review
  "abc.rules.from": "Kan hojii irra oolu irraa",  // draft – needs native review
  "abc.rules.source": "Madda",  // draft – needs native review
  "abc.rules.sourceHint": "fkn. Qajeelfama Lakk. …, keewwata …",  // draft – needs native review
  "abc.rules.status": "Mirkanaa'eeraa?",  // draft – needs native review
  "abc.rules.save": "Gatii haaraa olkaa'i",  // draft – needs native review
  "abc.rules.added": "Olkaa'ameera. Gatiin haaraan guyyaa isaa irraa hojii irra oola.",  // draft – needs native review

  // ── ABC formation & registration (A2) ─────────────────────────────────────
  "abc.tab.formation": "Hundeeffamaa fi galmee",  // draft – needs native review
  "abc.rule.board_min_members": "Boordii: miseensota xiqqaa (itti gaafatamaa dabalatee)",  // draft – needs native review
  "abc.form.checklist": "Galmeef qophaa'uu",  // draft – needs native review
  "abc.form.checklistHint": "{total} keessaa {done} qophaa'e. Daangaaleen seerota ABC hojii irra jiran irraa fudhatamu.",  // draft – needs native review
  "abc.form.haveNeed": "{need} keessaa {have}",  // draft – needs native review
  "abc.form.done": "Xumurameera",  // draft – needs native review
  "abc.form.missing": "Hin jiru",  // draft – needs native review
  "abc.form.draftRule": "(seera wixineen: mirkaneessaa)",  // draft – needs native review
  "abc.form.sharesLater": "Kaappitaalli kaffalame kaffaltii aksiyoonaa irraa lakkaa'ama (Aksiyoona, A4).",  // draft – needs native review
  "abc.ready.committee": "Koree qindeessaa",  // draft – needs native review
  "abc.ready.recognition": "Koreen beekamtii argate (qaama, guyyaa, xalayaa)",  // draft – needs native review
  "abc.ready.members": "Miseensota hundeessitoota",  // draft – needs native review
  "abc.ready.paid_capital": "Kaappitaala kaffalame",  // draft – needs native review
  "abc.ready.declared_paid": "Qooda kaappitaala labsame kaffalame",  // draft – needs native review
  "abc.ready.board": "Boordiin filatame (itti gaafatamaa + miseensota)",  // draft – needs native review
  "abc.ready.business_plan": "Karoorri daldalaa walitti qabsiifame (waggoota)",  // draft – needs native review
  "abc.ready.capital_deposit": "Ragaan kuusaa kaappitaalaa walitti qabsiifame",  // draft – needs native review
  "abc.ready.agreement": "Waliigalteen hundeeffamaa miseensota hundaan mallattaa'e",  // draft – needs native review
  "abc.doc.recognition": "Xalayaa beekamtii",  // draft – needs native review
  "abc.doc.founding_agreement": "Waliigaltee hundeeffamaa / seera bulchiinsaa",  // draft – needs native review
  "abc.doc.business_plan": "Karoora daldalaa",  // draft – needs native review
  "abc.doc.capital_deposit": "Ragaa kuusaa kaappitaalaa",  // draft – needs native review
  "abc.doc.registration_certificate": "Waraqaa ragaa galmee",  // draft – needs native review
  "abc.doc.minutes": "Galmee yaa'ii",  // draft – needs native review
  "abc.doc.other": "Kan biraa (fkn. garagalcha mallattaa'e)",  // draft – needs native review
  "abc.form.documents": "Galmeewwan",  // draft – needs native review
  "abc.form.documentsHint": "PDF, JPEG ykn PNG hanga 10 MB. Gosa wal fakkaatu haaraan fe'uun gosa haaraa dha; kan durii ni olkaa'amu.",  // draft – needs native review
  "abc.form.noDocuments": "Galmeen ammallee hin jiru.",  // draft – needs native review
  "abc.form.kind": "Gosa",  // draft – needs native review
  "abc.form.title": "Mata duree",  // draft – needs native review
  "abc.form.planYears": "Waggoota haguugaman",  // draft – needs native review
  "abc.form.years": "Waggoota {n}",  // draft – needs native review
  "abc.form.older": "gosa durii",  // draft – needs native review
  "abc.form.chooseFile": "Faayilii filadhaa",  // draft – needs native review
  "abc.form.fileTypes": "PDF, JPEG ykn PNG, hanga 10 MB",  // draft – needs native review
  "abc.form.upload": "Fe'i",  // draft – needs native review
  "abc.form.download": "Buusi",  // draft – needs native review
  "abc.form.uploaded": "Fe'ameera.",  // draft – needs native review
  "abc.form.recognition": "Beekamtii koree qindeessaa",  // draft – needs native review
  "abc.form.recognitionHint": "Ministeera ykn biiroo naannoon. Dursa xalayaa fe'aa (gosa: xalayaa beekamtii).",  // draft – needs native review
  "abc.form.recognizedBy": "{authority}n {date} beekamtii argate.",  // draft – needs native review
  "abc.form.authority": "Qaama",  // draft – needs native review
  "abc.form.date": "Guyyaa",  // draft – needs native review
  "abc.form.letter": "Xalayaa",  // draft – needs native review
  "abc.form.agreement": "Mallattoowwan waliigaltee hundeeffamaa",  // draft – needs native review
  "abc.form.signedCount": "Miseensota {total} keessaa {signed} gosa {v} mallatteessan.",  // draft – needs native review
  "abc.form.noAgreement": "Mallattoo sassaabuuf waliigaltee hundeeffamaa fe'aa.",  // draft – needs native review
  "abc.form.signedApp": "appii keessatti mirkaneesse",  // draft – needs native review
  "abc.form.signedScan": "waraqaa irratti mallatteesse",  // draft – needs native review
  "abc.form.notSigned": "hin mallatteessine",  // draft – needs native review
  "abc.form.signHow": "Miseensonni fuula ibsa isaanii appii keessatti mirkaneessu, ykn garagalcha waraqaa mallattaa'e galmeessitu (dursa 'Kan biraa' jettanii fe'aa).",  // draft – needs native review
  "abc.form.member": "Miseensa",  // draft – needs native review
  "abc.form.scan": "Garagalcha mallattaa'e",  // draft – needs native review
  "abc.form.recordScan": "Mallattoo galmeessi",  // draft – needs native review
  "abc.form.register": "Galmee",  // draft – needs native review
  "abc.form.notReady": "Dursa tarreeffama xumuraa; achiis galmee as galmeessaa.",  // draft – needs native review
  "abc.form.adminOverride": "Tarreeffamni hin xumuramne. Akka bulchaatti sababa isaa caqasuun galmee galmeessuu dandeessu (fkn. waltajjii dura galmaa'e).",  // draft – needs native review
  "abc.form.readyHint": "Hundi qophaa'eera. Galmee qaama irraa argame galmeessaa.",  // draft – needs native review
  "abc.form.regAuthority": "Qaama galmeessu",  // draft – needs native review
  "abc.form.regNumber": "Lakkoofsa galmee",  // draft – needs native review
  "abc.form.overrideReason": "Sababa (dirqama, yoo xiqqaate qubee 10)",  // draft – needs native review
  "abc.form.registerButton": "Galmee galmeessi",  // draft – needs native review
  "abc.form.registered": "Galmaa'eera",  // draft – needs native review
  "abc.form.registeredLine": "{authority}n, lakk. {number}, {date} galmaa'e.",  // draft – needs native review
  "abc.form.overrideNote": "Tarreeffamni osoo hin xumuramin bulchaan galmeesse: {reason}",  // draft – needs native review
  "abcInv.agreementHint": "Waliigalteen hundeeffamaa qophaa'eera. Dubbisaa, achiis walii galuu keessan mirkaneessaa.",  // draft – needs native review
  "abcInv.read": "Waliigaltee dubbisi",  // draft – needs native review
  "abcInv.confirm": "Nan waliigala, nan mallatteessa",  // draft – needs native review
  "abcInv.signed": "Waliigaltee hundeeffamaa {date} mallatteessitaniittu.",  // draft – needs native review

  // ── ABC member registry (A3) ──────────────────────────────────────────────
  "abc.reg.title": "Galmee miseensotaa",  // draft – needs native review
  "abc.reg.hint": "Miseensotaa fi affeerraa {n}. Lafa, hayyama fi bal'ina argachuuf miseensa tuqaa.",  // draft – needs native review
  "abc.reg.none": "Miseensi ammallee hin jiru.",  // draft – needs native review
  "abc.reg.members": "Miseensota",  // draft – needs native review
  "abc.reg.women": "Dubartoota",  // draft – needs native review
  "abc.reg.youth": "Dargaggoota (15-29)",  // draft – needs native review
  "abc.reg.unknown": "Kan hin galmoofne",  // draft – needs native review
  "abc.reg.plots": "Lafa {n}, hektaara {ha}",  // draft – needs native review
  "abc.reg.status.invited": "Affeerame",  // draft – needs native review
  "abc.reg.status.active": "Miseensa",  // draft – needs native review
  "abc.reg.consentLine": "Hayyama: {method}, {by}n {date} galmeesse.",  // draft – needs native review
  "abc.reg.irrigated": "jallisiin",  // draft – needs native review
  "abc.reg.noPlots": "Miseensi kun lafa hin galmeessine.",  // draft – needs native review
  "abc.reg.gender": "Saala",  // draft – needs native review
  "abc.reg.age": "Garee umurii",  // draft – needs native review
  "abc.reg.idReason": "Lakkoofsa eenyummaa guutuu maaliif barbaaddu? (galmee odiitii keessatti galmaa'a)",  // draft – needs native review
  "abc.reg.showId": "Eenyummaa guutuu agarsiisi",  // draft – needs native review
  "abc.reg.removeReason": "Sababa miseensi itti ba'u (seenaa keessatti olkaa'ama):",  // draft – needs native review
  "abc.reg.remove": "Miseensi ni ba'a",  // draft – needs native review
  "abc.reg.invited": "Affeerraan ergameera: qonnaan bulaan appii keessatti fudhata.",  // draft – needs native review
  "abc.reg.created": "Herregni uumameera, miseensis dabalameera. PIN yeroo qonnaan bulaaf kennaa.",  // draft – needs native review
  "abc.reg.added": "Miseensi dabalameera.",  // draft – needs native review
  "abc.reg.enrol": "Miseensa galmeessi",  // draft – needs native review
  "abc.reg.enrolHint": "Qonnaan bulaa jiru: bilbila qofa. Qonnaan bulaa haaraa: maqaa, aanaa fi PIN yeroo dabalataan.",  // draft – needs native review
  "abc.reg.consent": "Hayyama",  // draft – needs native review
  "abc.reg.newHint": "Qonnaan bulaa herrega hin qabneef qofa:",  // draft – needs native review
  "abc.reg.name": "Maqaa guutuu",  // draft – needs native review
  "abc.reg.pin": "PIN yeroo (lakkoofsa 6+)",  // draft – needs native review
  "abc.reg.idType": "Gosa eenyummaa",  // draft – needs native review
  "abc.reg.idNumber": "Lakkoofsa eenyummaa (filannoo)",  // draft – needs native review
  "abc.reg.idHint": "Iccitiin olkaa'ama; lakkoofsota 4 dhumaa qofatu mul'ata.",  // draft – needs native review
  "abc.reg.enrolButton": "Galmeessi",  // draft – needs native review
  "abc.reg.import": "Miseensota galchi (CSV)",  // draft – needs native review
  "abc.reg.importHint": "Miseensota baay'eef, fkn. waldaa jijjiiruuf. Dursa faayilii mirkaneessaa; hanga galchitanitti homtuu hin olkaa'amu.",  // draft – needs native review
  "abc.reg.check": "Faayilii mirkaneessi",  // draft – needs native review
  "abc.reg.importButton": "Miseensota {n} galchi",  // draft – needs native review
  "abc.reg.checkResult": "Tarree {rows}: {ok} qophaa'e (herrega haaraa {created}), {errors} rakkoo qaban.",  // draft – needs native review
  "abc.reg.importResult": "Tarree {rows} keessaa {ok} galfame (herrega haaraa {created}); {errors} dhiifame.",  // draft – needs native review
  "abc.reg.line": "Tarree {line}",  // draft – needs native review
  "abc.gender.female": "Dubartii",  // draft – needs native review
  "abc.gender.male": "Dhiira",  // draft – needs native review
  "abc.consent.app": "appii keessatti (affeerraa)",  // draft – needs native review
  "abc.consent.spoken": "afaaniin, hojjetaan galmeesse",  // draft – needs native review
  "abc.consent.paper": "unka waraqaa mallattaa'e",  // draft – needs native review
  "abc.idType.fayda": "Faayidaa (eenyummaa biyyaalessaa)",  // draft – needs native review
  "abc.idType.kebele_id": "Eenyummaa gandaa",  // draft – needs native review
  "abc.idType.other": "Eenyummaa biraa",  // draft – needs native review
};
