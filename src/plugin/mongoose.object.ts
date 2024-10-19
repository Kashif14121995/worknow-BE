import { Schema } from 'mongoose';

// Define the plugin
function toObjectPlugin(schema: Schema) {
  schema.post(['find', 'findOne', 'save'], function (result) {
    if (Array.isArray(result)) {
      return result.map((doc) => doc.toObject());
    } else if (result) {
      return result.toObject();
    }
    return result;
  });
}

export { toObjectPlugin };
