AI Research Platform — Windows install
======================================

This package is self-contained. Node.js is bundled, so you do NOT need to
install anything to start the platform.

QUICK START
-----------
1. Unzip this folder anywhere you like, e.g.  C:\ARP
   (Avoid a path that needs admin rights, like C:\Program Files.)
2. Double-click  Start-ARP.bat
3. Your browser opens at  http://localhost:3000
   Keep the "ARP Server" window open while you work; close it to stop.

That's it — the platform runs entirely on your computer.


ENABLE AI ANALYSIS (optional)
-----------------------------
On first run a file named ".env" is created next to Start-ARP.bat.
Open it in Notepad and set at least ONE provider key, then restart:

   GEMINI_API_KEY=...        (free tier: https://aistudio.google.com/apikey)
   DEEPSEEK_API_KEY=...
   OPENAI_API_KEY=...
   XAI_API_KEY=...
   ANTHROPIC_API_KEY=...

Without a key, the AI features show a clearly-labeled built-in fallback.
Everything else still works.


RUN YOUR COMSOL MODELS
----------------------
To actually run simulations, COMSOL must be installed on THIS computer.
In the ".env" file, point the platform at your comsolbatch.exe, for example:

   COMSOL_EXECUTABLE=D:\INSTALL\COMSOL Multiphysics v6.3.0.290_USTANOVKA\COMSOL63\Multiphysics\bin\win64\comsolbatch.exe

Then, when creating an experiment, use the "full path on this computer" field
to point at your .mph project (recommended for large/binary COMSOL files).


DATA
----
Your data lives in the "storage" folder next to Start-ARP.bat and stays on
your machine. Back up that folder to keep your projects and results.
