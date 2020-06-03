const path = require('path')
let PostgresStorageAdapterPath = path.join(process.cwd(), 'node_modules', 'parse-server', 'lib', 'Adapters', 'Storage', 'Postgres', 'PostgresStorageAdapter.js')
const fs = require('fs')

if (fs.existsSync(PostgresStorageAdapterPath)) {
    const postgresStorageAdapter = require(PostgresStorageAdapterPath)

    
    postgresStorageAdapter.PostgresStorageAdapter.prototype.setIndexesWithSchemaFormat = async function (className, submittedIndexes, existingIndexes = {}, fields, conn) {
        conn = conn || this._client;
        const self = this;
    
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
    
        const deletedIndexes = [];
        const insertedIndexes = [];
        const unqiueIndexes = []
        Object.keys(submittedIndexes).forEach(name => {
          const field = submittedIndexes[name];
    
          if (existingIndexes[name] && field.__op !== 'Delete') {
            throw new _node.default.Error(_node.default.Error.INVALID_QUERY, `Index ${name} exists, cannot update.`);
          }
    
          if (!existingIndexes[name] && field.__op === 'Delete') {
            throw new _node.default.Error(_node.default.Error.INVALID_QUERY, `Index ${name} does not exist, cannot delete.`);
          }
    
          if (field.__op === 'Delete') {
            deletedIndexes.push(name);
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
        await conn.tx('set-indexes-with-schema-format', async t => {
          if (insertedIndexes.length > 0) {
            await self.createIndexes(className, insertedIndexes, t);
          }
        if(unqiueIndexes.length>0){
            console.log('unqiueIndexes')
            await self.createIndexes(className, unqiueIndexes, t, true);
        }
          
    
          if (deletedIndexes.length > 0) {
            await self.dropIndexes(className, deletedIndexes, t);
          }
    
          await self._ensureSchemaCollectionExists(t);
          await t.none('UPDATE "_SCHEMA" SET $2:name = json_object_set_key($2:name, $3::text, $4::jsonb) WHERE "className" = $1', [className, 'schema', 'indexes', JSON.stringify(existingIndexes)]);
        });
      }

      postgresStorageAdapter.PostgresStorageAdapter.prototype.createIndexes = async function (className, indexes, conn, isUnique) {
        
        return (conn || this._client).tx(t => t.batch(indexes.map(i => {
            
            let str = isUnique ? 'CREATE UNIQUE INDEX $1:name ON $2:name ($3:name)' : 'CREATE INDEX $1:name ON $2:name ($3:name)'
            
          return t.none(str, [i.name, className, i.key]);
        })));
      }



}

