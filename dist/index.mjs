import z5, { z } from 'zod';
export { z } from 'zod';
import M, { Schema } from 'mongoose';
import { createRequire } from 'module';

// src/index.ts
var MongooseTypeOptionsSymbol = Symbol.for("MongooseTypeOptions");
var MongooseSchemaOptionsSymbol = Symbol.for("MongooseSchemaOptions");
var ZodMongoose = class extends z.ZodType {
  _parse(input) {
    return z.OK(input.data);
  }
  static create(def) {
    return new ZodMongoose(def);
  }
};
var toZodMongooseSchema = function(zObject, metadata = {}) {
  return ZodMongoose.create({ mongoose: metadata, innerType: zObject });
};
var addMongooseToZodPrototype = (toZ) => {
  if (toZ === null) {
    if (z.ZodObject.prototype.mongoose !== void 0) {
      delete z.ZodObject.prototype.mongoose;
    }
  } else if (toZ.ZodObject.prototype.mongoose === void 0) {
    toZ.ZodObject.prototype.mongoose = function(metadata = {}) {
      return toZodMongooseSchema(this, metadata);
    };
  }
};
var addMongooseTypeOptions = function(zObject, options) {
  zObject._def[MongooseTypeOptionsSymbol] = {
    ...zObject._def[MongooseTypeOptionsSymbol],
    ...options
  };
  return zObject;
};
var addMongooseTypeOptionsToZodPrototype = (toZ) => {
  if (toZ === null) {
    if (z.ZodType.prototype.mongooseTypeOptions !== void 0) {
      delete z.ZodType.prototype.mongooseTypeOptions;
    }
  } else if (toZ.ZodType.prototype.mongooseTypeOptions === void 0) {
    toZ.ZodType.prototype.mongooseTypeOptions = function(options) {
      return addMongooseTypeOptions(this, options);
    };
  }
};

// src/errors.ts
var MongooseZodError = class extends Error {
};
var DateFieldZod = () => z.date().default(/* @__PURE__ */ new Date());
var genTimestampsSchema = (createdAtField = "createdAt", updatedAtField = "updatedAt") => {
  if (createdAtField != null && updatedAtField != null && createdAtField === updatedAtField) {
    throw new MongooseZodError("`createdAt` and `updatedAt` fields must be different");
  }
  const schema = z.object({
    ...createdAtField != null && {
      [createdAtField]: DateFieldZod().mongooseTypeOptions({ immutable: true, index: true })
    },
    ...updatedAtField != null && {
      [updatedAtField]: DateFieldZod().mongooseTypeOptions({ index: true })
    }
  });
  schema._def[MongooseSchemaOptionsSymbol] = {
    ...schema._def[MongooseSchemaOptionsSymbol],
    timestamps: {
      createdAt: createdAtField == null ? false : createdAtField,
      updatedAt: updatedAtField == null ? false : updatedAtField
    }
  };
  return schema;
};
var noCastFn = (value) => value;
var MongooseZodBoolean = class extends M.SchemaTypes.Boolean {
  constructor() {
    super(...arguments);
    this.cast = noCastFn;
  }
};
MongooseZodBoolean.schemaName = "MongooseZodBoolean";
var MongooseZodDate = class extends M.SchemaTypes.Date {
  constructor() {
    super(...arguments);
    this.cast = noCastFn;
  }
};
MongooseZodDate.schemaName = "MongooseZodDate";
var MongooseZodNumber = class extends M.SchemaTypes.Number {
  constructor() {
    super(...arguments);
    this.cast = noCastFn;
  }
};
MongooseZodNumber.schemaName = "MongooseZodNumber";
var MongooseZodString = class extends M.SchemaTypes.String {
  constructor() {
    super(...arguments);
    this.cast = noCastFn;
  }
};
MongooseZodString.schemaName = "MongooseZodString";
var registerCustomMongooseZodTypes = () => {
  Object.assign(M.Schema.Types, {
    MongooseZodBoolean,
    MongooseZodDate,
    MongooseZodNumber,
    MongooseZodString
  });
};
var bufferMongooseGetter = (value) => value instanceof M.mongo.Binary ? value.buffer : value;
var setupState = { isSetUp: false };
var setup = (options = {}) => {
  if (setupState.isSetUp) {
    return;
  }
  setupState.isSetUp = true;
  setupState.options = options;
  addMongooseToZodPrototype(null);
  addMongooseTypeOptionsToZodPrototype(null);
  if (options.z !== null) {
    addMongooseToZodPrototype(options.z || z);
    addMongooseTypeOptionsToZodPrototype(options.z || z);
  }
};
var getValidEnumValues = (obj) => {
  const validKeys = Object.keys(obj).filter((k) => typeof obj[obj[k]] !== "number");
  const filtered = {};
  for (const k of validKeys) {
    filtered[k] = obj[k];
  }
  return Object.values(filtered);
};
var tryImportModule = (id, importMeta) => {
  const require2 = createRequire(importMeta.url);
  try {
    const modulePath = require2.resolve(id);
    return { module: require2(modulePath) };
  } catch {
    return null;
  }
};
var isZodType = (schema, typeName) => {
  return schema.constructor.name === typeName;
};
var unwrapZodSchema = (schema, options = {}, _features = {}) => {
  var _a, _b;
  const monTypeOptions = schema._def[MongooseTypeOptionsSymbol];
  _features.mongooseTypeOptions || (_features.mongooseTypeOptions = monTypeOptions);
  const monSchemaOptions = schema._def[MongooseSchemaOptionsSymbol];
  _features.mongooseSchemaOptions || (_features.mongooseSchemaOptions = monSchemaOptions);
  if (isZodType(schema, "ZodUnion")) {
    const unionSchemaTypes = schema._def.options.map((v) => v.constructor.name);
    if (new Set(unionSchemaTypes).size === 1) {
      _features.unionSchemaType ?? (_features.unionSchemaType = unionSchemaTypes[0]);
    }
  }
  if (schema instanceof ZodMongoose) {
    return unwrapZodSchema(schema._def.innerType, options, {
      ..._features,
      mongoose: schema._def.mongoose
    });
  }
  if (isZodType(schema, "ZodObject")) {
    const unknownKeys = schema._def.unknownKeys;
    if (unknownKeys === "strict" || unknownKeys === "passthrough") {
      return unwrapZodSchema(schema.strip(), options, { ..._features, unknownKeys });
    }
  }
  if (isZodType(schema, "ZodOptional")) {
    return unwrapZodSchema(schema.unwrap(), options, { ..._features, isOptional: true });
  }
  if (isZodType(schema, "ZodDefault")) {
    return unwrapZodSchema(
      schema._def.innerType,
      options,
      // Only top-most default value ends up being used
      // (in case of `<...>.default(1).default(2)`, `2` will be used as the default value)
      "default" in _features ? _features : { ..._features, default: schema._def.defaultValue() }
    );
  }
  if (isZodType(schema, "ZodBranded") || isZodType(schema, "ZodNullable")) {
    return unwrapZodSchema(schema.unwrap(), options, { ..._features });
  }
  if (isZodType(schema, "ZodEffects") && schema._def.effect.type === "refinement") {
    return unwrapZodSchema(schema._def.schema, options, _features);
  }
  if (isZodType(schema, "ZodArray") && !options.doNotUnwrapArrays) {
    const wrapInArrayTimes = Number(((_a = _features.array) == null ? void 0 : _a.wrapInArrayTimes) || 0) + 1;
    return unwrapZodSchema(schema._def.type, options, {
      ..._features,
      array: {
        ..._features.array,
        wrapInArrayTimes,
        originalArraySchema: ((_b = _features.array) == null ? void 0 : _b.originalArraySchema) || schema
      }
    });
  }
  return { schema, features: _features };
};
var zodInstanceofOriginalClasses = /* @__PURE__ */ new WeakMap();
var mongooseZodCustomType = (typeName, params) => {
  const instanceClass = typeName === "Buffer" ? Buffer : M.Types[typeName];
  const typeClass = M.Schema.Types[typeName];
  const result = z.instanceof(instanceClass, params);
  zodInstanceofOriginalClasses.set(result._def.schema, typeClass);
  return result;
};

// src/to-mongoose.ts
var { Mixed: MongooseMixed } = M.Schema.Types;
var originalMongooseLean = M.Query.prototype.lean;
registerCustomMongooseZodTypes();
var mlvPlugin = tryImportModule("mongoose-lean-virtuals", import.meta);
var mldPlugin = tryImportModule("mongoose-lean-defaults", import.meta);
var mlgPlugin = tryImportModule("mongoose-lean-getters", import.meta);
var getFixedOptionFn = (fn) => function(...args) {
  const thisFixed = this && this instanceof M.Document ? this : void 0;
  return fn.apply(thisFixed, args);
};
var getStrictOptionValue = (unknownKeys, schemaFeatures) => {
  const isStrictThrow = unknownKeys == null || unknownKeys === "throw" || schemaFeatures.unknownKeys === "strict";
  const isStrictFalse = unknownKeys === "strip-unless-overridden" && schemaFeatures.unknownKeys === "passthrough";
  return isStrictThrow ? "throw" : !isStrictFalse;
};
var addMongooseSchemaFields = (zodSchema, monSchema, context) => {
  var _a, _b, _c;
  const {
    fieldsStack = [],
    monSchemaOptions,
    monTypeOptions: monTypeOptionsFromSchema,
    unknownKeys
  } = context;
  const addToField = fieldsStack.at(-1);
  const fieldPath = fieldsStack.join(".");
  const isRoot = addToField == null;
  const throwError = (message, noPath) => {
    throw new MongooseZodError(`${noPath ? "" : `Path \`${fieldPath}\`: `}${message}`);
  };
  const { schema: zodSchemaFinal, features: schemaFeatures } = unwrapZodSchema(zodSchema);
  const monMetadata = schemaFeatures.mongoose || {};
  const {
    mongooseTypeOptions: monTypeOptionsFromField,
    mongooseSchemaOptions: monSchemaOptionsFromField,
    unionSchemaType
  } = schemaFeatures;
  const monTypeOptions = { ...monTypeOptionsFromField, ...monTypeOptionsFromSchema };
  const isRequired = !schemaFeatures.isOptional && !isZodType(zodSchemaFinal, "ZodNull");
  const isFieldArray = "array" in schemaFeatures;
  const mzOptions = [
    ["validate", monTypeOptions.mzValidate],
    ["required", monTypeOptions.mzRequired]
  ];
  mzOptions.forEach(([origName]) => {
    var _a2;
    const mzName = `mz${(_a2 = origName[0]) == null ? void 0 : _a2.toUpperCase()}${origName.slice(1)}`;
    if (mzName in monTypeOptions) {
      if (origName in monTypeOptions) {
        throwError(`Can't have both "${mzName}" and "${origName}" set`);
      }
      monTypeOptions[origName] = monTypeOptions[mzName];
      delete monTypeOptions[mzName];
    }
  });
  const commonFieldOptions = {
    required: isRequired,
    ..."default" in schemaFeatures ? { default: schemaFeatures.default } : (
      // `mongoose-lean-defaults` will implicitly set default values on sub schemas.
      // It will result in sub documents being ALWAYS defined after using `.lean()`
      // and even optional fields of that schema having `undefined` values.
      // This looks very weird to me and even broke my production.
      // You need to explicitly set `default: undefined` to sub schemas to prevent such a behaviour.
      isFieldArray || isZodType(zodSchemaFinal, "ZodObject") ? { default: void 0 } : {}
    ),
    ...isFieldArray && { castNonArrays: false },
    ...monTypeOptions
  };
  const [[, mzValidate], [, mzRequired]] = mzOptions;
  if (mzValidate != null) {
    let mzv = mzValidate;
    if (typeof mzv === "function") {
      mzv = getFixedOptionFn(mzv);
    } else if (!Array.isArray(mzv) && typeof mzv === "object" && !(mzv instanceof RegExp)) {
      mzv.validator = getFixedOptionFn(mzv.validator);
    } else if (Array.isArray(mzv) && !(mzv[0] instanceof RegExp && typeof mzv[1] === "string")) {
      const [firstElem, secondElem] = mzv;
      if (typeof firstElem === "function" && typeof secondElem === "string") {
        commonFieldOptions.mzValidate = [getFixedOptionFn(firstElem), secondElem];
      }
    }
    commonFieldOptions.validate = mzv;
  }
  if (mzRequired != null) {
    let mzr = mzRequired;
    if (typeof mzr === "function") {
      mzr = getFixedOptionFn(mzr);
    } else if (Array.isArray(mzr) && typeof mzr[0] === "function") {
      const [probablyFn] = mzr;
      if (typeof probablyFn === "function") {
        mzr[0] = getFixedOptionFn(probablyFn);
      }
    }
    commonFieldOptions.required = mzr;
  }
  if (isRequired) {
    if (commonFieldOptions.required !== true) {
      throwError("Can't have `required` set to anything but true if `.optional()` not used");
    }
  } else if (commonFieldOptions.required === true) {
    throwError("Can't have `required` set to true and `.optional()` used");
  }
  let fieldType;
  let errMsgAddendum = "";
  const typeKey = (isRoot ? monSchemaOptions == null ? void 0 : monSchemaOptions.typeKey : context.typeKey) ?? "type";
  if (isZodType(zodSchemaFinal, "ZodObject")) {
    const relevantSchema = isRoot ? monSchema : new Schema(
      {},
      {
        strict: getStrictOptionValue(unknownKeys, schemaFeatures),
        ...monSchemaOptionsFromField,
        typeKey,
        ...monMetadata == null ? void 0 : monMetadata.schemaOptions
      }
    );
    for (const [key, S] of Object.entries(zodSchemaFinal._def.shape())) {
      addMongooseSchemaFields(S, relevantSchema, {
        ...context,
        fieldsStack: [...fieldsStack, key],
        monTypeOptions: (_a = monMetadata.typeOptions) == null ? void 0 : _a[key],
        typeKey: ((_b = monMetadata == null ? void 0 : monMetadata.schemaOptions) == null ? void 0 : _b.typeKey) ?? typeKey
      });
    }
    if (isRoot) {
      return;
    }
    if (!("_id" in commonFieldOptions)) {
      commonFieldOptions._id = false;
    }
    fieldType = relevantSchema;
  } else if (isZodType(zodSchemaFinal, "ZodNumber") || unionSchemaType === "ZodNumber") {
    fieldType = MongooseZodNumber;
  } else if (isZodType(zodSchemaFinal, "ZodString") || unionSchemaType === "ZodString") {
    fieldType = MongooseZodString;
  } else if (isZodType(zodSchemaFinal, "ZodDate") || unionSchemaType === "ZodDate") {
    fieldType = MongooseZodDate;
  } else if (isZodType(zodSchemaFinal, "ZodBoolean") || unionSchemaType === "ZodBoolean") {
    fieldType = MongooseZodBoolean;
  } else if (isZodType(zodSchemaFinal, "ZodLiteral")) {
    const literalValue = zodSchemaFinal._def.value;
    const literalJsType = typeof literalValue;
    switch (literalJsType) {
      case "boolean": {
        fieldType = MongooseZodBoolean;
        break;
      }
      case "number": {
        fieldType = Number.isNaN(literalValue) ? MongooseMixed : Number.isFinite(literalValue) ? MongooseZodNumber : void 0;
        break;
      }
      case "string": {
        fieldType = MongooseZodString;
        break;
      }
      case "object": {
        if (!literalValue) {
          fieldType = MongooseMixed;
        }
        errMsgAddendum = "object literals are not supported";
        break;
      }
      default: {
        errMsgAddendum = "only boolean, number, string or null literals are supported";
      }
    }
  } else if (isZodType(zodSchemaFinal, "ZodEnum")) {
    const enumValues = zodSchemaFinal._def.values;
    if (Array.isArray(enumValues) && enumValues.length > 0 && enumValues.every((v) => typeof v === "string")) {
      fieldType = MongooseZodString;
    } else {
      errMsgAddendum = "only nonempty zod enums with string values are supported";
    }
  } else if (isZodType(zodSchemaFinal, "ZodNativeEnum")) {
    const enumValues = getValidEnumValues(zodSchemaFinal._def.values);
    const valuesJsTypes = [...new Set(enumValues.map((v) => typeof v))];
    if (valuesJsTypes.length === 1 && valuesJsTypes[0] === "number") {
      fieldType = MongooseZodNumber;
    } else if (valuesJsTypes.length === 1 && valuesJsTypes[0] === "string") {
      fieldType = MongooseZodString;
    } else if (valuesJsTypes.length === 2 && ["string", "number"].every((t) => valuesJsTypes.includes(t))) {
      fieldType = MongooseMixed;
    } else {
      errMsgAddendum = "only nonempty native enums with number and strings values are supported";
    }
  } else if (isZodType(zodSchema, "ZodNaN") || isZodType(zodSchema, "ZodNull")) {
    fieldType = MongooseMixed;
  } else if (isZodType(zodSchemaFinal, "ZodMap")) {
    fieldType = Map;
  } else if (isZodType(zodSchemaFinal, "ZodAny")) {
    const instanceOfClass = zodInstanceofOriginalClasses.get(zodSchemaFinal);
    fieldType = instanceOfClass || MongooseMixed;
    if (instanceOfClass === M.Schema.Types.Buffer && !("get" in commonFieldOptions)) {
      commonFieldOptions.get = bufferMongooseGetter;
    }
  } else if (isZodType(zodSchemaFinal, "ZodEffects")) {
    if (zodSchemaFinal._def.effect.type !== "refinement") {
      errMsgAddendum = "only refinements are supported";
    }
  } else if (isZodType(zodSchemaFinal, "ZodUnknown") || isZodType(zodSchemaFinal, "ZodRecord") || isZodType(zodSchemaFinal, "ZodUnion") || isZodType(zodSchemaFinal, "ZodTuple") || isZodType(zodSchemaFinal, "ZodDiscriminatedUnion") || isZodType(zodSchemaFinal, "ZodIntersection") || isZodType(zodSchemaFinal, "ZodTypeAny") || isZodType(zodSchemaFinal, "ZodType")) {
    fieldType = MongooseMixed;
  }
  if (isRoot) {
    throw new MongooseZodError("You must provide object schema at root level");
  }
  if (fieldType == null) {
    const typeName = zodSchemaFinal.constructor.name;
    throwError(`${typeName} type is not supported${errMsgAddendum ? ` (${errMsgAddendum})` : ""}`);
  }
  if (schemaFeatures.array) {
    for (let i = 0; i < schemaFeatures.array.wrapInArrayTimes; i++) {
      fieldType = [fieldType];
    }
  }
  monSchema.add({
    [addToField]: {
      ...commonFieldOptions,
      [typeKey]: fieldType
    }
  });
  (_c = monSchema.paths[addToField]) == null ? void 0 : _c.validate(function(value) {
    var _a2;
    let schemaToValidate = ((_a2 = schemaFeatures.array) == null ? void 0 : _a2.originalArraySchema) || zodSchemaFinal;
    if (isZodType(schemaToValidate, "ZodObject")) {
      schemaToValidate = z5.preprocess((obj) => {
        if (!obj || typeof obj !== "object") {
          return obj;
        }
        let objMaybeCopy = obj;
        for (const [k, v] of Object.entries(objMaybeCopy)) {
          if (v instanceof M.mongo.Binary) {
            if (objMaybeCopy === obj) {
              objMaybeCopy = { ...obj };
            }
            objMaybeCopy[k] = v.buffer;
          }
        }
        return objMaybeCopy;
      }, schemaToValidate);
    }
    const valueToParse = value && typeof value === "object" && "toObject" in value && typeof value.toObject === "function" ? value.toObject() : value;
    return schemaToValidate.parse(valueToParse), true;
  });
};
var isPluginDisabled = (name, option) => option != null && (option === true || option[name]);
var ALL_PLUGINS_DISABLED = {
  leanDefaults: true,
  leanGetters: true,
  leanVirtuals: true
};
var toMongooseSchema = (rootZodSchema, options = {}) => {
  var _a, _b, _c;
  if (!(rootZodSchema instanceof ZodMongoose)) {
    throw new MongooseZodError("Root schema must be an instance of ZodMongoose");
  }
  const globalOptions = ((_a = setupState.options) == null ? void 0 : _a.defaultToMongooseSchemaOptions) || {};
  const optionsFinal = {
    ...globalOptions,
    ...options,
    disablePlugins: {
      ...globalOptions.disablePlugins === true ? { ...ALL_PLUGINS_DISABLED } : globalOptions.disablePlugins,
      ...options.disablePlugins === true ? { ...ALL_PLUGINS_DISABLED } : options.disablePlugins
    }
  };
  const { disablePlugins: dp, unknownKeys } = optionsFinal;
  const metadata = rootZodSchema._def;
  const schemaOptionsFromField = (_b = metadata.innerType._def) == null ? void 0 : _b[MongooseSchemaOptionsSymbol];
  const schemaOptions = metadata == null ? void 0 : metadata.mongoose.schemaOptions;
  const addMLVPlugin = mlvPlugin && !isPluginDisabled("leanVirtuals", dp);
  const addMLDPlugin = mldPlugin && !isPluginDisabled("leanDefaults", dp);
  const addMLGPlugin = mlgPlugin && !isPluginDisabled("leanGetters", dp);
  const schema = new Schema(
    {},
    {
      id: false,
      minimize: false,
      strict: getStrictOptionValue(unknownKeys, unwrapZodSchema(rootZodSchema).features),
      ...schemaOptionsFromField,
      ...schemaOptions,
      query: {
        lean(leanOptions) {
          return originalMongooseLean.call(
            this,
            typeof leanOptions === "object" || leanOptions == null ? {
              ...addMLVPlugin && { virtuals: true },
              ...addMLDPlugin && { defaults: true },
              ...addMLGPlugin && { getters: true },
              versionKey: false,
              ...leanOptions
            } : leanOptions
          );
        },
        ...schemaOptions == null ? void 0 : schemaOptions.query
      }
    }
  );
  addMongooseSchemaFields(rootZodSchema, schema, { monSchemaOptions: schemaOptions, unknownKeys });
  addMLVPlugin && schema.plugin(mlvPlugin.module);
  addMLDPlugin && schema.plugin((_c = mldPlugin.module) == null ? void 0 : _c.default);
  addMLGPlugin && schema.plugin(mlgPlugin.module);
  return schema;
};

// src/index.ts
addMongooseToZodPrototype(z);
addMongooseTypeOptionsToZodPrototype(z);

export { MongooseSchemaOptionsSymbol, MongooseTypeOptionsSymbol, MongooseZodError, ZodMongoose, addMongooseTypeOptions, bufferMongooseGetter, genTimestampsSchema, mongooseZodCustomType, setup, toMongooseSchema, toZodMongooseSchema };
