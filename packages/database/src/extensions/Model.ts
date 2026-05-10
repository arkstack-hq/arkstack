import { Model as BaseModel, ModelAttributesOf, ModelQuerySchemaLike } from 'arkormx'

export abstract class Model<TSchema extends ModelQuerySchemaLike | Record<string, unknown> | string = Record<string, any>, TAttributes extends Record<string, unknown> = ModelAttributesOf<TSchema>> extends BaseModel<TSchema, TAttributes> {
}