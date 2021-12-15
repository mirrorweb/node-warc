const path = require('path')
const files = path.join(__dirname, '../files')
const warcs = {gzipped: path.join(files, 'parseMe.warc.gz'), notGz: path.join(files, 'parseMe.warc')}
const requestsJson = path.join(files, 'rawRequests2.json')
const capturedReqTestData = path.join(files, 'capturedReqTestData.json')

module.exports = {
  files,
  warcs,
  requestsJson,
  capturedReqTestData
}