const path = require('path')
let MongoStorageAdapterPath = path.join(process.cwd(),'node_modules', 'parse-server', 'lib', 'Adapters', 'Storage', 'Mongo', 'MongoStorageAdapter.js')
const fs = require('fs')
if (fs.existsSync(MongoStorageAdapterPath)) {
    const mongoStorageAdapter = require(MongoStorageAdapterPath)
    mongoStorageAdapter.MongoStorageAdapter.prototype.createIndexes = function (className, indexes) {
        let createPromiseList = []
        for (let index of indexes.map(v => v.key)) {
            createPromiseList.push(this._adaptiveCollection(className).then(collection => collection._ensureSparseUniqueIndexInBackground(index)).catch(err => this.handleError(err)))
        }
        return Promise.all(createPromiseList)
    }
}

