import { 
  ModelManager, 
  Serializer, 
  Factory, 
  TypedStack,
  ValidationException 
} from '@accordproject/concerto-core';

export interface ConcertoValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ConcertoValidationResult {
  isValid: boolean;
  errors: ConcertoValidationError[];
  validatedData?: any;
}

/**
 * Concerto service utility class for managing model loading and validation
 */
export class ConcertoService {
  private modelManager: ModelManager;
  private serializer: Serializer;
  private factory: Factory;
  private isModelLoaded: boolean = false;
  private rootTypeName: string | null = null;

  constructor() {
    this.modelManager = new ModelManager();
    this.serializer = new Serializer(this.factory, this.modelManager);
    this.factory = new Factory(this.modelManager);
  }

  /**
   * Load Concerto model from DSL string
   * @param concertoDSL - The Concerto model definition as string
   * @param rootType - Optional root type name for validation (e.g., 'com.example.MyModel')
   * @throws Error if model loading fails
   */
  async loadModel(concertoDSL: string, rootType?: string): Promise<void> {
    try {
      // Clear any existing models
      this.modelManager.clearModelFiles();
      
      // Add the new model from string
      this.modelManager.addCTOModel(concertoDSL, undefined, true);
      
      // Validate the model
      await this.modelManager.validateModelFiles();
      
      // Recreate serializer and factory with updated model manager
      this.factory = new Factory(this.modelManager);
      this.serializer = new Serializer(this.factory, this.modelManager);
      
      this.isModelLoaded = true;
      this.rootTypeName = rootType || null;
      
      console.log('✅ Concerto model loaded successfully');
    } catch (error) {
      this.isModelLoaded = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading model';
      console.error('❌ Failed to load Concerto model:', errorMessage);
      throw new Error(`Failed to load Concerto model: ${errorMessage}`);
    }
  }

  /**
   * Validate JSON data against the loaded Concerto model
   * @param jsonData - The data to validate
   * @param typeName - Optional specific type name to validate against
   * @returns ConcertoValidationResult with validation status and errors
   */
  validateData(jsonData: any, typeName?: string): ConcertoValidationResult {
    if (!this.isModelLoaded) {
      return {
        isValid: false,
        errors: [{
          field: 'model',
          message: 'No Concerto model loaded. Please load a model first.'
        }]
      };
    }

    try {
      // Use provided type name or fall back to root type
      const targetType = typeName || this.rootTypeName;
      
      if (!targetType) {
        return {
          isValid: false,
          errors: [{
            field: 'type',
            message: 'No target type specified for validation. Please provide a type name.'
          }]
        };
      }

      // Attempt to deserialize and validate the data
      const validatedResource = this.serializer.fromJSON(jsonData, {
        acceptResourcesForRelationships: true,
        validate: true,
        convertResourcesToRelationships: false
      });

      return {
        isValid: true,
        errors: [],
        validatedData: validatedResource
      };

    } catch (error) {
      console.error('❌ Concerto validation failed:', error);
      
      // Handle ValidationException specifically
      if (error instanceof ValidationException) {
        const errors: ConcertoValidationError[] = [];
        
        // Extract validation errors from the exception
        const validationErrors = error.getErrors();
        validationErrors.forEach((validationError) => {
          errors.push({
            field: validationError.getShortMessage() || 'unknown',
            message: validationError.getMessage() || 'Validation error',
            value: validationError.getFileLocation?.() || undefined
          });
        });

        return {
          isValid: false,
          errors: errors.length > 0 ? errors : [{
            field: 'validation',
            message: error.message || 'Validation failed'
          }]
        };
      }

      // Handle other types of errors
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: error instanceof Error ? error.message : 'Unknown validation error'
        }]
      };
    }
  }

  /**
   * Get all declared types in the loaded model
   * @returns Array of type names available in the model
   */
  getAvailableTypes(): string[] {
    if (!this.isModelLoaded) {
      return [];
    }

    try {
      const modelFiles = this.modelManager.getModelFiles();
      const types: string[] = [];
      
      modelFiles.forEach(modelFile => {
        const declarations = modelFile.getAllDeclarations();
        declarations.forEach(declaration => {
          types.push(declaration.getFullyQualifiedName());
        });
      });
      
      return types;
    } catch (error) {
      console.error('❌ Failed to get available types:', error);
      return [];
    }
  }

  /**
   * Create a new instance of a specific type with default values
   * @param typeName - The fully qualified type name
   * @returns New instance with default values or null if creation fails
   */
  createInstance(typeName: string): any | null {
    if (!this.isModelLoaded) {
      console.error('❌ No model loaded');
      return null;
    }

    try {
      const resource = this.factory.newResource(
        this.getNamespace(typeName),
        this.getTypeName(typeName),
        this.generateId()
      );
      
      return this.serializer.toJSON(resource);
    } catch (error) {
      console.error('❌ Failed to create instance:', error);
      return null;
    }
  }

  /**
   * Check if a model is currently loaded
   */
  isLoaded(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Get the current root type name
   */
  getRootType(): string | null {
    return this.rootTypeName;
  }

  // Private helper methods
  private getNamespace(fullyQualifiedName: string): string {
    const lastDotIndex = fullyQualifiedName.lastIndexOf('.');
    return lastDotIndex > 0 ? fullyQualifiedName.substring(0, lastDotIndex) : '';
  }

  private getTypeName(fullyQualifiedName: string): string {
    const lastDotIndex = fullyQualifiedName.lastIndexOf('.');
    return lastDotIndex > 0 ? fullyQualifiedName.substring(lastDotIndex + 1) : fullyQualifiedName;
  }

  private generateId(): string {
    return `id_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export a singleton instance for use throughout the application
export const concertoService = new ConcertoService();

// Export convenience functions for direct usage
export async function loadConcertoModel(dslString: string, rootType?: string): Promise<void> {
  return concertoService.loadModel(dslString, rootType);
}

export function validateWithConcerto(data: any, typeName?: string): ConcertoValidationResult {
  return concertoService.validateData(data, typeName);
}

export function getConcertoTypes(): string[] {
  return concertoService.getAvailableTypes();
}

export function createConcertoInstance(typeName: string): any | null {
  return concertoService.createInstance(typeName);
}