import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'uz';

type Dict = Record<string, string>;

// English is the base table and the fallback for any key missing in another
// language. Add new UI strings here (both tables) and reference them via t().
const en: Dict = {
  // Language switcher
  'lang.label': 'Language',
  'lang.en': 'EN',
  'lang.uz': 'UZ',

  // Sidebar
  'nav.modules': 'Research Modules',
  'nav.ai': 'AI Scientist Agent',
  'nav.dashboard': 'Research Dashboard',
  'nav.experiments': 'Active Experiments',
  'nav.queue': 'Simulation Orchestrator',
  'nav.plugins': 'Simulator Plugins',
  'nav.optimization': 'Optimization Engine',
  'nav.visualization': 'Scientific Visualizer',
  'nav.reports': 'Publication Reports',
  'workspace.title': 'Active Workspace',
  'workspace.noProject': 'No project selected',
  'workspace.noExperiment': 'No experiment',

  // Header
  'header.subtitle': 'Multi-Physics Simulation Engine',
  'header.project': 'Project:',
  'header.experiment': 'Experiment:',
  'header.noExperiments': 'No experiments',
  'header.jobsRunning': '{n} simulation job(s) running',
  'header.engineIdle': 'Simulation engine idle',
  'header.aiActive': 'AI Scientist active',
  'header.newExp': 'New Exp',
  'header.runSimulation': 'Run Simulation',

  // AI research entry view
  'entry.badge': 'AI Scientific Orchestration Engine',
  'entry.title': 'AI Autonomous Research Agent',
  'entry.desc':
    'State your scientific objective. The AI Agent will analyze the target physics, select the real numerical simulator executable, configure parameter bounds, and execute autonomous optimization loops.',
  'entry.tag.realExec': 'Real Software Execution',
  'entry.tag.zero': 'Zero Synthetic Approximations',
  'entry.tag.sweeps': 'Autonomous Parameter Sweeps',
  'entry.question': 'What research do you want to perform?',
  'entry.step1of3': 'Step 1 of 3',
  'entry.placeholder':
    'e.g. Optimize gate workfunction and channel doping in Synopsys Sentaurus TCAD to minimize subthreshold leakage below 60 mV/dec...',
  'entry.analyzeBtn': 'Analyze Scientific Objective',
  'entry.presets': 'Or choose a preset scientific goal:',
  'entry.recent': 'Recent Active Experiments',
  'entry.recentHint': 'Select to resume live monitor',
  'entry.simulator': 'Simulator:',
  'entry.viewExecution': 'View Execution',
  'entry.analyzing': 'Analyzing Scientific Objective...',
  'entry.analyzingHint':
    'The backend planning engine is selecting a numerical solver and proposing initial parameters.',
  'entry.analysisComplete': 'AI Objective Analysis Complete',
  'entry.targetIdentified': 'Target Simulator Identified',
  'entry.changeObjective': 'Change Objective',
  'entry.selectedEngine': 'Selected Simulator Engine',
  'entry.physicsDomain': 'Physics Domain',
  'entry.modelFormat': 'Model Format',
  'entry.haveModelQ': 'Do you already have a scientific model file for this research?',
  'entry.haveModelHint': 'Upload your existing model file, or let the AI Agent attach an optimized starter template.',
  'entry.yesUpload': 'YES — Upload Model File',
  'entry.yesUploadHint': 'I have an existing file (e.g. .mph, .cmd, .py, .fsp, .in, .m, .foam) ready for parameter injection.',
  'entry.noTemplate': 'NO — Generate Template',
  'entry.noTemplateHint': 'The AI Agent will automatically generate a standard starter script template for {name}.',
  'entry.selectFromStorage': 'Select Model File from Local Storage:',
  'entry.loaded': 'Loaded: {name}',
  'entry.ready': 'Ready',
  'entry.launch': 'Launch Autonomous Scientific Research',
  'entry.configureBtn': 'Configure with AI',

  // AI setup / confirm step
  'setup.title': 'AI Experiment Setup',
  'setup.planning': 'The AI is designing your experiment setup…',
  'setup.byAi': 'Proposed by {provider}',
  'setup.fallbackBadge': 'Rule-based (AI not active)',
  'setup.parameters': 'Parameters to vary',
  'setup.param': 'Parameter',
  'setup.baseline': 'Baseline',
  'setup.min': 'Min',
  'setup.max': 'Max',
  'setup.unit': 'Unit',
  'setup.targetMetrics': 'Target metrics',
  'setup.method': 'Method',
  'setup.estimatedRuns': 'Estimated runs',
  'setup.notes': 'Notes',
  'setup.back': 'Back',
  'setup.confirmRun': 'Confirm & Run',
  'setup.retry': 'Retry',

  // New experiment modal
  'modal.title': 'Execute Model Experiment',
  'modal.activeProject': 'Active Research Project',
  'modal.universalSimulator': 'Universal Simulator',
  'modal.selectModel': 'Select Scientific Model File *',
  'modal.fetchingModels': 'Fetching models...',
  'modal.noModelsTitle': 'No Scientific Model Files in This Project Yet',
  'modal.noModelsHint':
    'Upload a model file (.mph, .cmd, .in, .py, .fsp) from your computer using the button below to run an experiment.',
  'modal.uploadBtn': 'Upload model file from your computer',
  'modal.uploading': 'Uploading model…',
  'modal.pathPlaceholder': '…or full path on this computer, e.g. D:\\models\\heatsink.mph',
  'modal.useFilePath': 'Use file path',
  'modal.pathHint':
    'Recommended for COMSOL .mph and other large/binary models — the file is read in place when the platform runs on the same machine as the solver.',
  'modal.autoDetected': 'Auto-Detected Execution Specifications',
  'modal.verifiedModel': 'VERIFIED MODEL',
  'modal.simulatorPlatform': 'Simulator Platform:',
  'modal.physicsModule': 'Physics Module:',
  'modal.workspaceIsolation': 'Workspace Isolation:',
  'modal.originalUnchanged': '(Original file unchanged)',
  'modal.experimentTitle': 'Experiment Title *',
  'modal.titlePlaceholder': 'e.g. 3nm Nanosheet I-V Transport Sweep',
  'modal.researchGoal': 'Research Goal & Simulation Notes',
  'modal.goalPlaceholder': 'Specific scientific objective for this simulation run...',
  'modal.tags': 'Tags (comma separated)',
  'modal.aiEngine': 'AI Engine for this experiment',
  'modal.noProvider':
    'No AI provider is configured. Set an API key (e.g. GEMINI_API_KEY) in your .env to enable AI analysis. The experiment still runs without it.',
  'modal.ensembleHint': 'Ensemble mode: all {n} models answer, then results are combined.',
  'modal.pickHint': 'Pick one, or select several to compare their answers and get a combined conclusion.',
  'modal.noKey': 'no API key',
  'modal.providerNoKey': 'Set {key} in .env to enable this provider',
  'modal.binaryUseFilePath':
    '{ext} is a binary solver file — uploading corrupts it. Instead, paste its full path in the "full path on this computer" field below, then click "Use file path".',
  'modal.runExperiment': 'Run Experiment',

  // Dashboard
  'dash.bannerSubtitle':
    'Automating multi-physics simulation workflows across COMSOL, TCAD, and other solvers — parameter sweeps, real-time telemetry, and AI analysis of your own models.',
  'dash.primaryPlugin': 'Simulators',
  'dash.pluginsAvailable': '{n} available',
  'dash.insights': 'AI Scientist Insights',
  'dash.noAnalysisTitle': 'No analysis yet',
  'dash.noAnalysisBody':
    'Nothing here is pre-filled or simulated. Once you run an experiment, the AI\'s insights about YOUR model appear here.',
  'dash.step1': '1. Add your model (e.g. .mph) to a project',
  'dash.step2': '2. Create an experiment and select that model',
  'dash.step3': '3. Run Simulation — your solver computes it locally',
  'dash.step4': '4. The AI Assistant analyzes your real results',
  'dash.goProjects': 'Go to Projects',
  'dash.haveRuns': 'You have {n} completed run(s). Open the AI Assistant to analyze your actual results.',
  'dash.analyzeAI': 'Analyze with AI',

  // AI chat assistant
  'chat.title': 'AI Scientist Chat Assistant',
  'chat.subtitle':
    "Powered by Claude AI. Context-aware analysis of your simulation's physics, parameters, and results — for COMSOL, TCAD, and any other solver.",
  'chat.context': 'Context',
  'chat.clear': 'Clear conversation',
  'chat.run.btn': 'Run & analyze',
  'chat.run.hint': 'Runs the current model, then the AI analyzes the real results.',
  'chat.run.starting': 'Starting the run…',
  'chat.run.running': 'Running… {p}%',
  'chat.run.analyzing': 'Run finished — analyzing results…',
  'chat.run.failed': 'Run failed: {e}',
  'chat.run.analyzePrompt': 'The simulation just finished. Analyze the real results in context: report the computed metrics and figures of merit, flag any anomalies or non-physical/trivial solutions, and recommend the next step. If the results are empty or degenerate, say so and explain why.',
  'auto.title': 'Autonomous research sweep',
  'auto.subtitle':
    'The platform runs one solve per parameter value on its own, collects the results, and the AI writes the conclusion. Your model must expose this as a COMSOL Global Parameter.',
  'auto.parameter': 'Parameter',
  'auto.unit': 'Unit',
  'auto.objective': 'Objective metric (optional)',
  'auto.start': 'Start',
  'auto.stop': 'Stop',
  'auto.step': 'Step',
  'auto.points': '{count} point(s)',
  'auto.launch': 'Launch sweep',
  'auto.stop.btn': 'Stop',
  'auto.progress': '{done}/{total} done',
  'auto.col.status': 'Status',
  'auto.col.objective': 'Objective',
  'auto.conclusion': 'AI conclusion',
  'auto.err.range': 'Enter a valid start/stop/step (step > 0) producing at least one point.',
  'chat.welcome':
    'Hi! I\'m your AI Scientist Assistant, monitoring experiment "{title}". Ask me about the physics, parameters, or results of this model.',
  'chat.physicsFallback': 'simulation',
  'chat.preset.physics': 'Explain the governing physics and equations in this {physics} model.',
  'chat.preset.params': 'Which input parameters most affect the results, and what ranges should I sweep?',
  'chat.preset.results': 'Analyze the latest results — highlight key trends and any anomalies.',
  'chat.preset.next': 'Summarize this simulation setup and recommend the next experiment.',

  // Settings panel
  'settings.open': 'Settings',
  'settings.title': 'Settings',
  'keys.section': 'AI API keys',
  'comsol.section': 'COMSOL (local solver)',
  'comsol.desc':
    'Point the platform at your comsolbatch.exe (or the folder that contains it) so it can run .mph models. COMSOL does NOT need to be open — the platform launches it in the background.',
  'comsol.detected': 'Detected',
  'comsol.notDetected': 'Not detected',
  'comsol.placeholder': 'e.g. D:\\…\\COMSOL63\\Multiphysics\\bin\\win64\\comsolbatch.exe',
  'comsol.save': 'Save COMSOL path',
  'comsol.saved': 'Saved — COMSOL is now configured.',
  'comsol.saveNotFound': 'Saved, but comsolbatch was not found there. Double-check the path.',

  // API keys settings
  'keys.title': 'AI API Keys',
  'keys.desc': 'Enter an API key to enable a provider. Keys are saved on this computer (.env) and take effect immediately — no restart, no file editing.',
  'keys.configured': 'configured',
  'keys.notSet': 'not set',
  'keys.placeholder': 'Paste API key…',
  'keys.placeholderSet': 'Configured — paste a new key to replace',
  'keys.save': 'Save keys',
  'keys.saving': 'Saving…',
  'keys.saved': 'Saved. Providers updated.',
  'keys.free': 'free',
  'keys.getKey': 'Get key',
  'keys.open': 'AI keys',

  // Common
  'common.cancel': 'Cancel',
  'common.close': 'Close',
};

const uz: Dict = {
  // Language switcher
  'lang.label': 'Til',
  'lang.en': 'EN',
  'lang.uz': 'UZ',

  // Sidebar
  'nav.modules': 'Tadqiqot modullari',
  'nav.ai': 'AI Olim agenti',
  'nav.dashboard': 'Tadqiqot paneli',
  'nav.experiments': 'Faol eksperimentlar',
  'nav.queue': 'Simulyatsiya navbati',
  'nav.plugins': 'Simulyator plaginlari',
  'nav.optimization': 'Optimizatsiya dvigateli',
  'nav.visualization': 'Ilmiy vizualizatsiya',
  'nav.reports': 'Nashr hisobotlari',
  'workspace.title': 'Faol ish maydoni',
  'workspace.noProject': 'Loyiha tanlanmagan',
  'workspace.noExperiment': 'Eksperiment yo‘q',

  // Header
  'header.subtitle': 'Ko‘p-fizikali simulyatsiya dvigateli',
  'header.project': 'Loyiha:',
  'header.experiment': 'Eksperiment:',
  'header.noExperiments': 'Eksperimentlar yo‘q',
  'header.jobsRunning': '{n} ta simulyatsiya bajarilmoqda',
  'header.engineIdle': 'Simulyatsiya dvigateli bo‘sh',
  'header.aiActive': 'AI Olim faol',
  'header.newExp': 'Yangi eksp.',
  'header.runSimulation': 'Ishga tushirish',

  // AI research entry view
  'entry.badge': 'AI ilmiy boshqaruv dvigateli',
  'entry.title': 'AI Avtonom Tadqiqot Agenti',
  'entry.desc':
    'Ilmiy maqsadingizni yozing. AI agent maqsadli fizikani tahlil qiladi, haqiqiy raqamli simulyator dasturini tanlaydi, parametr chegaralarini sozlaydi va avtonom optimizatsiya sikllarini bajaradi.',
  'entry.tag.realExec': 'Haqiqiy dastur ijrosi',
  'entry.tag.zero': 'Sun‘iy taxminlarsiz',
  'entry.tag.sweeps': 'Avtonom parametr o‘zgartirish',
  'entry.question': 'Qanday tadqiqot qilmoqchisiz?',
  'entry.step1of3': '1-qadam / 3',
  'entry.placeholder':
    'masalan: Synopsys Sentaurus TCAD‘da gate workfunction va kanal legirlanishini optimallashtirib, quyi ostona oqimini 60 mV/dek dan pastga tushirish...',
  'entry.analyzeBtn': 'Ilmiy maqsadni tahlil qilish',
  'entry.presets': 'Yoki tayyor ilmiy maqsadni tanlang:',
  'entry.recent': 'So‘nggi faol eksperimentlar',
  'entry.recentHint': 'Jonli kuzatuvni davom ettirish uchun tanlang',
  'entry.simulator': 'Simulyator:',
  'entry.viewExecution': 'Ijroni ko‘rish',
  'entry.analyzing': 'Ilmiy maqsad tahlil qilinmoqda...',
  'entry.analyzingHint':
    'Backend rejalashtirish dvigateli raqamli yechuvchini tanlab, boshlang‘ich parametrlarni taklif qilmoqda.',
  'entry.analysisComplete': 'AI maqsad tahlili tugadi',
  'entry.targetIdentified': 'Maqsadli simulyator aniqlandi',
  'entry.changeObjective': 'Maqsadni o‘zgartirish',
  'entry.selectedEngine': 'Tanlangan simulyator dvigateli',
  'entry.physicsDomain': 'Fizika sohasi',
  'entry.modelFormat': 'Model formati',
  'entry.haveModelQ': 'Bu tadqiqot uchun ilmiy model faylingiz bormi?',
  'entry.haveModelHint': 'Mavjud model faylingizni yuklang yoki AI agent optimallashtirilgan boshlang‘ich shablon biriktirsin.',
  'entry.yesUpload': 'HA — Model faylini yuklash',
  'entry.yesUploadHint': 'Menda tayyor fayl bor (masalan .mph, .cmd, .py, .fsp, .in, .m, .foam) — parametr kiritishga tayyor.',
  'entry.noTemplate': 'YO‘Q — Shablon yaratish',
  'entry.noTemplateHint': 'AI agent {name} uchun standart boshlang‘ich skript shablonini avtomatik yaratadi.',
  'entry.selectFromStorage': 'Lokal xotiradan model faylini tanlang:',
  'entry.loaded': 'Yuklandi: {name}',
  'entry.ready': 'Tayyor',
  'entry.launch': 'Avtonom ilmiy tadqiqotni boshlash',
  'entry.configureBtn': 'AI bilan sozlash',

  // AI setup / confirm step
  'setup.title': 'AI eksperiment sozlamasi',
  'setup.planning': 'AI eksperiment sozlamangizni loyihalamoqda…',
  'setup.byAi': '{provider} tomonidan taklif qilindi',
  'setup.fallbackBadge': 'Qoidaga asoslangan (AI faol emas)',
  'setup.parameters': 'O‘zgartiriladigan parametrlar',
  'setup.param': 'Parametr',
  'setup.baseline': 'Boshlang‘ich',
  'setup.min': 'Min',
  'setup.max': 'Maks',
  'setup.unit': 'Birlik',
  'setup.targetMetrics': 'Maqsadli ko‘rsatkichlar',
  'setup.method': 'Usul',
  'setup.estimatedRuns': 'Taxminiy ishga tushirishlar',
  'setup.notes': 'Eslatmalar',
  'setup.back': 'Orqaga',
  'setup.confirmRun': 'Tasdiqlash va ishga tushirish',
  'setup.retry': 'Qayta urinish',

  // New experiment modal
  'modal.title': 'Model eksperimentini bajarish',
  'modal.activeProject': 'Faol tadqiqot loyihasi',
  'modal.universalSimulator': 'Universal simulyator',
  'modal.selectModel': 'Ilmiy model faylini tanlang *',
  'modal.fetchingModels': 'Modellar yuklanmoqda...',
  'modal.noModelsTitle': 'Bu loyihada hali ilmiy model fayli yo‘q',
  'modal.noModelsHint':
    'Eksperiment o‘tkazish uchun quyidagi tugma orqali kompyuteringizdan model faylini (.mph, .cmd, .in, .py, .fsp) yuklang.',
  'modal.uploadBtn': 'Kompyuteringizdan model faylini yuklang',
  'modal.uploading': 'Model yuklanmoqda…',
  'modal.pathPlaceholder': '…yoki bu kompyuterdagi to‘liq yo‘l, masalan D:\\models\\heatsink.mph',
  'modal.useFilePath': 'Fayl yo‘lidan foydalanish',
  'modal.pathHint':
    'COMSOL .mph va boshqa katta/binary modellar uchun tavsiya etiladi — platforma yechuvchi bilan bir kompyuterda ishlaganda fayl joyida o‘qiladi.',
  'modal.autoDetected': 'Avtomatik aniqlangan ijro spetsifikatsiyalari',
  'modal.verifiedModel': 'TASDIQLANGAN MODEL',
  'modal.simulatorPlatform': 'Simulyator platformasi:',
  'modal.physicsModule': 'Fizika moduli:',
  'modal.workspaceIsolation': 'Ish maydoni izolyatsiyasi:',
  'modal.originalUnchanged': '(Asl fayl o‘zgarmaydi)',
  'modal.experimentTitle': 'Eksperiment nomi *',
  'modal.titlePlaceholder': 'masalan: 3nm Nanosheet I-V transport o‘zgartirishi',
  'modal.researchGoal': 'Tadqiqot maqsadi va eslatmalar',
  'modal.goalPlaceholder': 'Ushbu simulyatsiya uchun aniq ilmiy maqsad...',
  'modal.tags': 'Teglar (vergul bilan ajratilgan)',
  'modal.aiEngine': 'Bu eksperiment uchun AI dvigateli',
  'modal.noProvider':
    'Hech qanday AI provayder sozlanmagan. AI tahlilini yoqish uchun .env faylida API kalit (masalan GEMINI_API_KEY) o‘rnating. Eksperiment usiz ham ishlaydi.',
  'modal.ensembleHint': 'Ansambl rejim: {n} ta model javob beradi, keyin natijalar birlashtiriladi.',
  'modal.pickHint': 'Bittasini tanlang yoki javoblarini solishtirib umumiy xulosa olish uchun bir nechtasini belgilang.',
  'modal.noKey': 'kalit yo‘q',
  'modal.providerNoKey': 'Bu provayderni yoqish uchun .env‘da {key} ni o‘rnating',
  'modal.binaryUseFilePath':
    '{ext} — bu binary yechuvchi fayl, yuklash uni buzadi. Buning o‘rniga pastdagi "to‘liq yo‘l" maydoniga uning to‘liq yo‘lini joylashtiring va "Use file path" ni bosing.',
  'modal.runExperiment': 'Eksperimentni ishga tushirish',

  // Dashboard
  'dash.bannerSubtitle':
    'Ko‘p-fizikali simulyatsiya jarayonlarini avtomatlashtiradi — COMSOL, TCAD va boshqa yechuvchilar uchun: parametr sweep, real vaqt telemetriyasi va o‘z modellaringizni AI tahlili.',
  'dash.primaryPlugin': 'Simulyatorlar',
  'dash.pluginsAvailable': '{n} ta mavjud',
  'dash.insights': 'AI Olim tahlillari',
  'dash.noAnalysisTitle': 'Hali tahlil yo‘q',
  'dash.noAnalysisBody':
    'Bu yerda hech narsa oldindan to‘ldirilmagan yoki soxta emas. Eksperiment ishga tushirganingizdan so‘ng, AI’ning AYNAN SIZNING modelingiz haqidagi tahlili shu yerda paydo bo‘ladi.',
  'dash.step1': '1. Modelingizni (masalan .mph) loyihaga qo‘shing',
  'dash.step2': '2. Eksperiment yarating va o‘sha modelni tanlang',
  'dash.step3': '3. "Run Simulation" — yechuvchingiz lokal hisoblaydi',
  'dash.step4': '4. AI yordamchisi haqiqiy natijalaringizni tahlil qiladi',
  'dash.goProjects': 'Loyihalarga o‘tish',
  'dash.haveRuns': '{n} ta yakunlangan hisob bor. Haqiqiy natijalarni tahlil qilish uchun AI yordamchisini oching.',
  'dash.analyzeAI': 'AI bilan tahlil qilish',

  // AI chat assistant
  'chat.title': 'AI Olim Chat Yordamchisi',
  'chat.subtitle':
    'Claude AI asosida. Simulyatsiyangizning fizikasi, parametrlari va natijalarini kontekstga qarab tahlil qiladi — COMSOL, TCAD va boshqa yechuvchilar uchun.',
  'chat.context': 'Kontekst',
  'chat.clear': 'Yozishmani tozalash',
  'chat.run.btn': 'Ishga tushir va tahlil qil',
  'chat.run.hint': 'Joriy modelni ishga tushiradi, keyin AI real natijalarni tahlil qiladi.',
  'chat.run.starting': 'Ishga tushirilyapti…',
  'chat.run.running': 'Hisoblanyapti… {p}%',
  'chat.run.analyzing': 'Hisob tugadi — natija tahlil qilinyapti…',
  'chat.run.failed': 'Xato: {e}',
  'chat.run.analyzePrompt': 'Simulyatsiya endigina tugadi. Kontekstdagi real natijalarni tahlil qil: hisoblangan metrikalar va ko‘rsatkichlarni ayt, anomaliya yoki nofizik/trivial (nol) yechim bo‘lsa belgila, va keyingi qadamni tavsiya qil. Agar natija bo‘sh yoki degenerativ bo‘lsa — shuni ochiq ayt va sababini tushuntir.',
  'auto.title': 'Avtonom tadqiqot supurishi',
  'auto.subtitle':
    'Platforma har bir parametr qiymati uchun bittadan hisobni o‘zi ishga tushiradi, natijalarni yig‘adi va AI xulosa yozadi. Modelingizda bu COMSOL Global Parameter sifatida bo‘lishi kerak.',
  'auto.parameter': 'Parametr',
  'auto.unit': 'Birlik',
  'auto.objective': 'Maqsad metrikasi (ixtiyoriy)',
  'auto.start': 'Boshlanish',
  'auto.stop': 'Tugash',
  'auto.step': 'Qadam',
  'auto.points': '{count} ta nuqta',
  'auto.launch': 'Supurishni boshlash',
  'auto.stop.btn': 'To‘xtatish',
  'auto.progress': '{done}/{total} bajarildi',
  'auto.col.status': 'Holat',
  'auto.col.objective': 'Maqsad',
  'auto.conclusion': 'AI xulosasi',
  'auto.err.range': 'To‘g‘ri boshlanish/tugash/qadam kiriting (qadam > 0), kamida bitta nuqta chiqsin.',
  'chat.welcome':
    'Salom! Men AI Olim yordamchingizman, "{title}" eksperimentini kuzatyapman. Bu model fizikasi, parametrlari yoki natijalari haqida so‘rang.',
  'chat.physicsFallback': 'simulyatsiya',
  'chat.preset.physics': 'Bu {physics} modelidagi asosiy fizika va tenglamalarni tushuntir.',
  'chat.preset.params': 'Qaysi kirish parametrlari natijaga eng ko‘p ta’sir qiladi va qanday oraliqda o‘zgartiray?',
  'chat.preset.results': 'So‘nggi natijalarni tahlil qil — asosiy tendensiyalar va anomaliyalarni ko‘rsat.',
  'chat.preset.next': 'Bu simulyatsiya sozlamasini jamla va keyingi eksperimentni tavsiya qil.',

  // Settings panel
  'settings.open': 'Sozlamalar',
  'settings.title': 'Sozlamalar',
  'keys.section': 'AI API kalitlari',
  'comsol.section': 'COMSOL (lokal yechuvchi)',
  'comsol.desc':
    'Platforma .mph modellarni ishga tushira olishi uchun comsolbatch.exe (yoki uni o‘z ichiga olgan papka) yo‘lini ko‘rsating. COMSOL ochiq bo‘lishi SHART EMAS — platforma uni fonda o‘zi ishga tushiradi.',
  'comsol.detected': 'Topildi',
  'comsol.notDetected': 'Topilmadi',
  'comsol.placeholder': 'masalan: D:\\…\\COMSOL63\\Multiphysics\\bin\\win64\\comsolbatch.exe',
  'comsol.save': 'COMSOL yo‘lini saqlash',
  'comsol.saved': 'Saqlandi — COMSOL endi sozlangan.',
  'comsol.saveNotFound': 'Saqlandi, lekin comsolbatch u yerdan topilmadi. Yo‘lni tekshiring.',

  // API keys settings
  'keys.title': 'AI API kalitlari',
  'keys.desc': 'Provayderni yoqish uchun API kalit kiriting. Kalitlar shu kompyuterda (.env) saqlanadi va darrov ishlaydi — restart ham, fayl tahrirlash ham shart emas.',
  'keys.configured': 'sozlangan',
  'keys.notSet': 'yo‘q',
  'keys.placeholder': 'API kalitni joylashtiring…',
  'keys.placeholderSet': 'Sozlangan — almashtirish uchun yangi kalit joylashtiring',
  'keys.save': 'Kalitlarni saqlash',
  'keys.saving': 'Saqlanmoqda…',
  'keys.saved': 'Saqlandi. Provayderlar yangilandi.',
  'keys.free': 'bepul',
  'keys.getKey': 'Kalit olish',
  'keys.open': 'AI kalitlari',

  // Common
  'common.cancel': 'Bekor qilish',
  'common.close': 'Yopish',
};

const translations: Record<Lang, Dict> = { en, uz };

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'arp.lang';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'uz') return saved;
    } catch {
      /* localStorage unavailable */
    }
    return 'uz';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let str = translations[lang]?.[key] ?? en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
};
