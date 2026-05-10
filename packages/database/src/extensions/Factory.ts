import { ModelFactory as BaseModelFactory, FactoryAttributes, ModelAttributes } from 'arkormx'

export abstract class ModelFactory<TModel, TAttributes extends FactoryAttributes = Partial<ModelAttributes<TModel>>> extends BaseModelFactory<TModel, TAttributes> {
}