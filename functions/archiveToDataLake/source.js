exports = async function() {
  // CHANGE THESE BELOW
  const serviceName = "mongodb-atlas";
  const dbName = "Campaign2012";
  const collName = "donations";
  const query = { contributor_state: "TX" };
  const bucketName = "rob-atlas-data-lake-demo";
  const fileName = "json/campaign2012/test";
  const fileType = ".json";
  
  // settings (not required to change)
  const limit = 300;
  const docsPerFile = 100;
  // =================================
  
  const collection = context.services.get(serviceName).db(dbName).collection(collName);
  
  const cursor = await findDocumentsToArchive(collection, query, limit);
  
  let hasNext = true, docsToArchive = [], docIds = [];
  while (hasNext) {
    try {
      [ docsToArchive, docIds, hasNext ] = await nextDocumentsFromCursor(cursor, docsPerFile);
      if (docsToArchive.length !== 0 && docIds.length !== 0) {
        console.log(`Found ${docIds.length} documents`);
        const [storedFileName, _putObjectOutput] =  await storeInS3(docsToArchive, bucketName, fileName, fileType);
        // console.log(JSON.stringify(_putObjectOutput));
        console.log(`Stored ${docIds.length} documents to file '${storedFileName}' in S3`);
        const deleteResult = await deleteDocuments(collection, docIds);
        console.log(`Removed ${deleteResult.deletedCount} of ${docIds.length} documents from Atlas cluster`);
      }
    } catch (err) {
      throw err;
      break;
    }
  }
  
  return true;
};

// returns a cursor of documents that will be archived
function findDocumentsToArchive(collection, query, limit) {
  return collection.find(query).limit(limit);
}

// get the next X documents from the cursor
async function nextDocumentsFromCursor(cursor, limit) {
  let docsToArchive = [], docIds = [], hasNext = true;
  while (docsToArchive.length < limit) {
    const doc = await cursor.next()
    .then(doc => {
      return doc;
    })
    .catch(err => {
      console.error(`Failed to find documents: ${err}`);
      throw err;
    });
    if (doc) {
      docsToArchive.push(doc);
      docIds.push(doc._id);
    } else {
      hasNext = false;
      break;
    }
  }
  
  return [ docsToArchive, docIds, hasNext ];
}

// store JSON object in S3
function storeInS3(jsonObj, bucketName, fileName, fileType) {
  fileName = fileName + " " + getFormattedDate();
  // Serialize JSON object
  const jsonBody = JSON.stringify(jsonObj);
  // Instantiate an S3 service client
  const s3Service = context.services.get('s3').s3('us-east-1');
  // Put the object in S3
  return s3Service.PutObject({
    'Bucket': bucketName,
    'Key': fileName,
    'ContentType': fileType,
    'Body': jsonBody
  })
  .then(putObjectOutput => {
    // putObjectOutput: {
    //   ETag: <string>, // The object's S3 entity tag
    // }
    return [fileName, putObjectOutput];
  })
  .catch(err => {
    console.error(`Storing document in S3 failed with error: ${err}`);
    throw err;
  });
}

// delete documents by array of IDs
function deleteDocuments(collection, ids) {
  return collection.deleteMany({_id: {$in: ids}})
  .then(result => {
    return result;
  })
  .catch(err => {
    console.error(`Delete failed with error: ${err}`);
    throw err;
  });
}

// formats the current date in short style with leading zeroes
function getFormattedDate() {
  const currDate = new Date();
  return ("0" + currDate.getDate()).slice(-2) + "-" + 
  ("0" + currDate.getMonth()).slice(-2) + " " + 
  ("0" + currDate.getHours()).slice(-2) + ":" + 
  ("0" + currDate.getMinutes()).slice(-2) + ":" + 
  ("0" + currDate.getSeconds()).slice(-2)
}