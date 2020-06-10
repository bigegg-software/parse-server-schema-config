require('./extend/MongoStorageAdapter')
require('./extend/PostgresStorageAdapter')
const _types = {
    string: 'addString',
    number: 'addNumber',
    boolean: 'addBoolean',
    date: 'addDate',
    file: 'addFile',
    array: 'addArray',
    object: 'addObject',
    pointer: 'addPointer',
    relation: 'addRelatoin',
    index: 'addIndex',
    geoPoint: 'addGeoPoint',
    polygon: 'addPolygon'
}

const _defaultClass = {
    _User: ['objectId', 'createdAt', 'updatedAt', 'ACL', 'username', 'password', 'email', 'emailVerified', 'authData'],
    _Role: ['objectId', 'createdAt', 'updatedAt', 'ACL', 'name', 'users', 'roles'],
    _Session: ['objectId', 'createdAt', 'updatedAt', 'ACL','restricted','user','installationId','sessionToken','expiresAt','createdWith']
}
const _defaultKeys = ['objectId', 'createdAt', 'updatedAt', 'ACL']
const _defaultClassIndex = {
    _User: ['_id_', 'username_1', 'email_1', 'case_insensitive_email', 'case_insensitive_username'],
    _Role: ['_id_', 'name_1']
}
const _defaultIndex = ['_id_']


class SchemaConfig {
    static  _filterDefault(data, defaultKey) {
        return data.filter(key => !defaultKey.find(v => v == key))
    }
    static async  _getAllSchema(){
        return await Parse.Schema.all(null, { useMasterKey: true })
    }
    static _updateIndex(schema, originIndexs, sourceIndexs) {
        
        let originIndexsKey = Object.keys(originIndexs)
        let sourceIndexsKey = Object.keys(sourceIndexs)
        let defaultIndex = _defaultClassIndex[schema.className] || _defaultIndex
        let deleteIndexs = originIndexsKey.filter(key => !sourceIndexsKey.find(v => `${schema.className}_${v}` == key))

        deleteIndexs = SchemaConfig._filterDefault(deleteIndexs, defaultIndex)

        let addIndexs = sourceIndexsKey.filter(key => !originIndexsKey.find(v => v== `${schema.className}_${key}`))
        addIndexs = SchemaConfig._filterDefault(addIndexs, defaultIndex)
        //todo 更新
        
        deleteIndexs.forEach(key => {
            console.log('delete',key)
            schema.deleteIndex(`${key}`)
        })
        addIndexs.forEach(key =>{
            if(sourceIndexs[key].unique){
                sourceIndexs[key].field.__op = 'AddUnique'  
            }
            console.log('add',`${schema.className}_${key}`, sourceIndexs[key].field)
            
            schema.addIndex(`${schema.className}_${key}`, sourceIndexs[key].field)
    
        })
        
        return schema
    }
    static _updateField(schema, originFields, sourceFields){
        
        let originFieldsKey = Object.keys(originFields)
        let sourceFieldsKey = Object.keys(sourceFields)
        let defaultKeys = _defaultClass[schema.className] || _defaultKeys

        let deleteKeys = originFieldsKey.filter(key => !sourceFieldsKey.find(v => v == key))
        deleteKeys = SchemaConfig._filterDefault(deleteKeys, defaultKeys)
        let addKeys = sourceFieldsKey.filter(key => !originFieldsKey.find(v => v == key))
        addKeys = SchemaConfig._filterDefault(addKeys, defaultKeys)

        let updateKeys = originFieldsKey.filter(key => !!sourceFieldsKey.find(v => v == key)).filter( key => {
            return originFields[key].type.toLowerCase() != sourceFields[key].type.toLowerCase()
        })
        
        updateKeys = SchemaConfig._filterDefault(updateKeys, defaultKeys)
        deleteKeys =  deleteKeys.concat(updateKeys)
        addKeys = addKeys.concat(updateKeys)

        deleteKeys.forEach(key => {
            schema.deleteField(key)
        })

        addKeys.forEach(key=>{
            if(sourceFields[key].targetClass){
                schema[_types[sourceFields[key].type]](key, sourceFields[key].targetClass, sourceFields[key].options)
            }else{
                schema[_types[sourceFields[key].type]](key, sourceFields[key].options)
            }
        })
        return schema
    }
    static async _deleteSchema(className){
        let schema = new Parse.Schema(className)
        await schema.delete()

    }
    static async _updateSchema( className, originSchema, sourceSchema){
        let isUpdate = !!originSchema
        
        originSchema = originSchema || {} 
        originSchema.fields = originSchema.fields || {}  
        originSchema.indexes = originSchema.indexes|| {} 
        sourceSchema.indexes = sourceSchema.indexes || {}
        sourceSchema.fields = sourceSchema.fields || {}
        
        let schema = new Parse.Schema(className)
        if(!sourceSchema){
            return await schema.delete()
        }
        
        schema = SchemaConfig._updateField(schema, originSchema.fields, sourceSchema.fields)
        
        schema = SchemaConfig._updateIndex(schema, originSchema.indexes, sourceSchema.indexes)
        if(sourceSchema.CLP){
            schema.setCLP(sourceSchema.CLP)
        }
        if(isUpdate){
            await schema.update()
        }else{
            await schema.save()
        }
    }
    static async config(schemaList){
        let allSchema = await SchemaConfig._getAllSchema()
        
        for(let sourceSchema of schemaList){
            let originSchema = allSchema.find(v => v.className == sourceSchema.className)
            await SchemaConfig._updateSchema(sourceSchema.className, originSchema, sourceSchema)
        }
        let sourceSchemas = schemaList.map(v => v.className)
        let deleteSchemas = allSchema.filter(v => !sourceSchemas.find(name => name == v.className) ).map(v => v.className)
        deleteSchemas = SchemaConfig._filterDefault(deleteSchemas, Object.keys(_defaultClass))
        for(let schemaName of deleteSchemas){
            SchemaConfig._deleteSchema(schemaName)
        }
        

    }
}




module.exports = SchemaConfig
