Update the data structure that the server saves data to in order to show rich status and progress tracking.
Create a new API service that returns a paginated list of jobs. The data for this comes from reading the `data/jobs` directory to find the 
Create a new API service that uses HTTP streaming to show the list of jobs and sends updates every second with any updates to that list or the status of any job in the list.
Create a new API services that present the status and progress of a give job by ID.
Create a new API service that uses HTTP Streaming to show the status and progress information for a job along with what artifacts have been created (such as dm notes, summary, etc.), the text values of those artifacts, etc.
list of UUIDs and reading the `index.json` file of each of those child directories.
The statuses should show the various stages of processing, what stages are complete, which one is currently running, and which stages have yet to be completed.
The progress should show a percentage completion of each stage.
The processing logic should update the data under `data/jobs` so that data is kept up to date with what is happening.
