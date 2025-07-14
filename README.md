https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart?hl=fr&account_type=user#node.js

[Install gcloud on Windows](https://cloud.google.com/sdk/docs/install#windows)

* installed in C:\Users\pasca\AppData\Local\Google\Cloud SDK
* All options are checked
* Project ID is ===> add in .env

Then activate the API: create a new project (called astro-dev)

alias gcloud="/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud"



/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud auth application-default login
/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud auth xxxNUMBERxxx login



/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud config set account pascal.brand38@gmail.com
/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud auth application-default set-quota-project
/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud config set project astro-dev

/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud auth application-default login --scopes="https://www.googleapis.com/auth/generative-language,https://www.googleapis.com/auth/cloud-platform"


/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud auth application-default login --scopes="https://www.googleapis.com/auth/cloud-platform"


gcloud projects add-iam-policy-binding xxxNUMBERxxx --member="user:pascal.brand38@gmail.com" --role="roles/serviceusage.serviceUsageConsumer"

gcloud auth application-default set-quota-project xxxNUMBERxxx

gcloud auth application-default login --scopes="https://www.googleapis.com/auth/analytics,https://www.googleapis.com/auth/cloud-platform"

analyticsdata.googleapis.com


------------------

alias gcloud="/c/Users/pasca/AppData/Local/Google/Cloud\ SDK/google-cloud-sdk/bin/gcloud"
gcloud auth application-default login
gcloud auth application-default login --scopes="https://www.googleapis.com/auth/analytics,https://www.googleapis.com/auth/cloud-platform"
gcloud services enable analyticsdata.googleapis.com

gcloud auth application-default set-quota-project astro-dev-WHATTHE


node src/sample.mjs
