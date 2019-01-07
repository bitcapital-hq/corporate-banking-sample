import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeepPartial,
    FindManyOptions,
    FindOneOptions,
    IsNull,
    PrimaryGeneratedColumn,
    SaveOptions,
    UpdateDateColumn,
    UpdateResult,
    ObjectType
  } from "typeorm";
  import { validate, ValidationError, ValidatorOptions } from "class-validator";
  
  export interface ExtendedEntitySchema {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }
  
  const findOptionsWithoutSoftDeleted = <T extends ExtendedEntity>(options: FindOneOptions<T> = {}) => {
    // Our little trick to exclude soft deleted entities wouldn't work with string wheres
    // Better throw a error that you can actually understand than wait for the spread operator to break at runtime
    if (typeof options.where === "string") throw new Error("Where can't be a string!");
  
    options.where = { ...(options.where as FindOneOptions<T>), deletedAt: IsNull() };
    return options;
  };
  
  export default abstract class ExtendedEntity extends BaseEntity implements ExtendedEntitySchema {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
  
    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
  
    @Column("timestamp with time zone", { name: "deleted_at", nullable: true })
    deletedAt?: Date;
  
    constructor(data: Partial<ExtendedEntity> = {}) {
      super();
  
      this.id = data.id;
      this.deletedAt = data.deletedAt;
    }
  
    /**
     * Find all non soft deleted entities
     * Accepts all TypeORM options except string wheres
     *
     * @static
     * @template T
     * @param {FindManyOptions<T>} options
     * @memberof ExtendedEntity
     */
    static async safeFind<T extends ExtendedEntity>(this: ObjectType<T>, options: FindManyOptions<T> = {}): Promise<T[]> {
      return BaseEntity.find.call(this, findOptionsWithoutSoftDeleted(options));
    }
  
    /**
     * Find one non soft deleted entity
     * Accepts all TypeORM options except string wheres
     *
     * @static
     * @template T
     * @param {FindManyOptions<T>} options
     * @memberof ExtendedEntity
     */
    static async safeFindOne<T extends ExtendedEntity>(this: ObjectType<T>, options: FindOneOptions<T> = {}): Promise<T> {
      return BaseEntity.findOne.call(this, findOptionsWithoutSoftDeleted(options));
    }
  
    static async safeUpdate<T extends ExtendedEntity>(id: string, partialEntity: DeepPartial<T>, options?: SaveOptions) {
      // This will be generated by TypeORM, so let's remove it from the schema to prevent problems
      delete partialEntity.createdAt;
      delete partialEntity.updatedAt;
  
      await BaseEntity.save.call(this, { id, ...(partialEntity as Object) }, options);
  
      // TODO: Not performatic
      return await ExtendedEntity.safeFindOne.call(this, { where: { id } });
    }
  
    /**
     * Count all non soft deleted entities
     * Accepts all TypeORM options except string wheres
     *
     * @static
     * @template T
     * @param {FindManyOptions<T>} options
     * @returns {Promise<number>}
     * @memberof ExtendedEntity
     */
    static async safeCount<T extends ExtendedEntity>(this: ObjectType<T>, options?: FindManyOptions<T>): Promise<number> {
      return BaseEntity.count.call(this, findOptionsWithoutSoftDeleted(options));
    }
  
    /**
     * Soft delete a entity by it's uuid
     *
     * @static
     * @template T
     * @param {string} id
     * @returns {Promise<UpdateResult>}
     * @memberof ExtendedEntity
     * @todo Cascade soft delete to relations
     */
    static async softDelete<T extends ExtendedEntity>(id: string): Promise<UpdateResult> {
      // We must use any as DeepPartial breaks things for reasons unkown
      return BaseEntity.update.call(this, id, { deletedAt: new Date() } as any);
    }
  
    async validate(validatorOptions?: ValidatorOptions): Promise<ValidationError[]> {
      return validate(this, { forbidUnknownValues: true, ...validatorOptions });
    }
  }
  