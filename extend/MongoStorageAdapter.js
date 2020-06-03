const path = require('path')
let MongoStorageAdapterPath = path.join(process.cwd(), 'node_modules', 'parse-server', 'lib', 'Adapters', 'Storage', 'Mongo', 'MongoStorageAdapter.js')
const fs = require('fs')
if (fs.existsSync(MongoStorageAdapterPath)) {
    const mongoStorageAdapter = require(MongoStorageAdapterPath)
    mongoStorageAdapter.MongoStorageAdapter.prototype.setIndexesWithSchemaFormat = function (className, submittedIndexes, existingIndexes = {}, fields) {
        if (submittedIndexes === undefined) {
            return Promise.resolve();
        }

        if (Object.keys(existingIndexes).length === 0) {
            existingIndexes = {
                _id_: {
                    _id: 1
                }
            };
        }

        const deletePromises = [];
        const insertedIndexes = [];
        const unqiueIndexes = []
        Object.keys(submittedIndexes).forEach(name => {
            let field = submittedIndexes[name];

            if (existingIndexes[name] && field.__op !== 'Delete') {
                throw new _node.default.Error(_node.default.Error.INVALID_QUERY, `Index ${name} exists, cannot update.`);
            }

            if (!existingIndexes[name] && field.__op === 'Delete') {
                throw new _node.default.Error(_node.default.Error.INVALID_QUERY, `Index ${name} does not exist, cannot delete.`);
            }

            if (field.__op === 'Delete') {
                const promise = this.dropIndex(className, name);
                deletePromises.push(promise);
                delete existingIndexes[name];
            } else {
                Object.keys(field).forEach(key => {

                    if (key != '__op' && !Object.prototype.hasOwnProperty.call(fields, key)) {
                        throw new _node.default.Error(_node.default.Error.INVALID_QUERY, `Field ${key} does not exist, cannot add index.`);
                    }
                });
                if(field.__op == 'AddUnique'){
                    delete field.__op;
                    unqiueIndexes.push({
                        key: field,
                        name
                    });
                }else{
                    delete field.__op;
                    insertedIndexes.push({
                        key: field,
                        name
                    });
                }


                existingIndexes[name] = field;

                
            }
        });
        let insertUniquePromise = [];

        for (let index of unqiueIndexes.map(v => v.key)) {

            insertUniquePromise.push(this._adaptiveCollection(className).then(collection => collection._ensureSparseUniqueIndexInBackground(index)).catch(err => this.handleError(err)))
        }

        let insertPromise = Promise.resolve();
        
        if (insertedIndexes.length > 0) {
            insertPromise = this.createIndexes(className, insertedIndexes);
        }
        

        return Promise.all(deletePromises).then(()=> Promise.all(insertUniquePromise)).then(() => Promise.all(insertedIndexes)).then(() => this._schemaCollection()).then(schemaCollection => schemaCollection.updateSchema(className, {
            $set: {
                '_metadata.indexes': existingIndexes
            }
        })).catch(err => this.handleError(err));
    }




}

