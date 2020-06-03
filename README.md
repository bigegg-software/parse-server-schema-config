```
    const modelList = [
    {
        className: 'Subject',
        fields: {
            level1: {
                type: 'string'
            },
            level2: {
                type: 'string'
            },
            level3: {
                type: 'string'
            },
            level4: {
                type: 'string'
            },
            subject:{
                name: 'subject',
                type: 'pointer',
                targetClass: 'Subject',
            }

        }
        CLP: {
            addField: {},
            find: { '*': true },
            count: { '*': true },
            get: { '*': true },
            create: { 'role:admin': true },
            update: { 'role:admin': true },
            delete: { 'role:admin': true },
        },
        indexes: {
            level4_1: { //如果使用postgres 全局不能重复
                field: { 'level4': 1 }
                unique: true
            }
        }
    }
]
SchemaConfig.config(modelList)
```