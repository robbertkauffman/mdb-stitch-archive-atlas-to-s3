# [MongoDB] Stitch Function for Archiving from Atlas to AWS S3
Stitch function for archiving data from Atlas to AWS S3. It queries an Atlas cluster for to-be-archived documents, stores the result in S3 and then removes the documents from the Atlas cluster.

# Installation

## Warning
This function **REMOVES** data from your Atlas cluster after storing it in S3. It should not remove any data if storing the data in S3 fails. Nevertheless, it's strongly recommended to test this in a test cluster first. Verify that the function queries your cluster successfully, the data ends up in S3, and the documents are removed from your Atlas cluster. Monitor the Stitch app logs regularly if you run the function periodically using *Triggers*, in case there are any failures.

## 1. Import app

Clone or download this project and use [Stich CLI](https://docs.mongodb.com/stitch/deploy/stitch-cli-reference/index.html)
to import the app:
```bash
$ stitch-cli login --api-key=my-api-key --private-api-key=my-private-api-key
$ stitch-cli import
```

Make sure you have [configured Atlas API access](https://docs.atlas.mongodb.com/configure-api-access/) and replace the *api-key* and *private-api-key* values before running the *login* command. Follow the prompts when running the *import* command. Eventually, the import should fail with the following error: `failed to import app: error: error validating Service: s3: could not find secret "aws_secret"`

Next, add a [secret](https://aws.amazon.com/blogs/security/wheres-my-secret-access-key/) for the AWS S3 service and replace the values of the *name* and *value* parameters:
```bash
$ stitch-cli secrets add --name=secret-name --value=secret-value
```

Finally, import the app again:
```bash
$ stitch-cli import --strategy=replace
```

Follow the prompts. This time it should import successfully.

## 2. Link cluster
In Atlas go to *Stitch* on the left and select the imported Stitch app. Navigate to *Clusters* on the left and select the *mongodb-atlas* cluster. Finally, select the cluster you want to use from the *Atlas Cluster* dropdown menu, and click *Save*. 

## 3. Update
Still in the Stitch app, navigate to *Functions* on the left and select the *archiveToDataLake* function. In the function code change the following settings on lines 4 to 9:
* dbName — name of database that will be queried
* collName — name of collection that will be queried
* query — JSON object containing the query
* bucketName — name of the AWS S3 bucket to store the data
* fileName — filename of files stored in S3
* fileType — extension of files stored in S3

Optionally, update the settings *limit* and *docsPerFile* on lines 12 and 13. These settings are used to control the maximum amount of documents that are returned for the query, and the amount of documents that are stored per file. Please note that increasing these can increase the function execution time, and decreasing could lower this. See also the section on *Function execution time* below.

Hit *Save*.

### Function execution time
Stitch Function runtime is limited to 90 seconds. If it takes longer than 90 seconds to query Atlas, store in S3 and delete in Atlas, then the function can terminate before completing due to exceeding the execution time. In this case, configure a lower *limit* and/or *docsPerFile* to reduce the time needed to archive the data. 

## 4. Enable trigger
If you want the archive function to run periodically, in the Stitch app go to *Triggers* on the left and select *archiveToDataLike*. Toggle the *Enabled* trigger and click *Save*.

You should now be good to go!
