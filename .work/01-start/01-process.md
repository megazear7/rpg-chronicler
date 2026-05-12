Review the contents of the `/Users/alexlockhart/src/rpg-session-processor` project
Specifically review the `sendAndSave` function from the `/Users/alexlockhart/src/rpg-session-processor/src/model.ts` file
Copy the functionality of that project, specifically the `sendAndSave` function, into the `src/server` code of the `rpg-chronicler` project by creating a new API in the server code with the corresponding service declaration in the shared code, following all the best practices and established patterns in this project.
Save all of the artifacts that the process creates into the `data/jobs` directory.
For each process that runs, a new directory should be created under `data/jobs` that contains all of the data specific to this job. The name of the child directory should be a UUID.
These child directories should each have an `index.json` file that has a "file", "status", and "totalProgress" attributes that provide an at a glance understanding of that job.
Come up with a well structured way to organize the artifacts that it creates.
Add a simple UI feature to allow an audio file to be uploaded and processed.
