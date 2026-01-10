/**
 * Code template utilities for generating language-specific templates
 * based on backend interface specifications
 */

// Generate code template based on interface specification
export const generateCodeTemplate = (language, interfaceSpec = null, functionTemplates = null) => {
  
  // First priority: Use function templates from backend (if provided)
  if (functionTemplates && functionTemplates[language] && functionTemplates[language].stub_code) {
    return functionTemplates[language].stub_code;
  }
  
  // Second priority: Use interface_spec to generate template
  if (interfaceSpec && typeof interfaceSpec === 'object' && interfaceSpec.function_name) {
    return generateFunctionTemplate(language, interfaceSpec);
  }
  
  // Legacy: Check for mode-based interface_spec
  if (interfaceSpec && interfaceSpec.mode === 'FUNCTION') {
    return generateFunctionTemplate(language, interfaceSpec);
  }
  
  // Fallback: Minimal template
  return getMinimalTemplate(language);
};

// Generate function-based template
const generateFunctionTemplate = (language, spec, problemTitle = '') => {
  if (!spec || !spec.function_name) {
    console.error('❌ Invalid spec provided to generateFunctionTemplate:', spec);
    return getMinimalTemplate(language);
  }
  
  const { function_name, parameters = [], params = [], return_type, returns } = spec;
  // Support both field names: parameters (new) and params (legacy)
  const paramList = parameters?.length > 0 ? parameters : (params || []);
  const returnType = return_type || returns;
  
  
  switch (language) {
    case 'python':
      const pythonParams = paramList.map(p => p.name).join(', ');
      const pythonReturn = mapTypeToPython(returnType);
      
      return `def ${function_name}(${pythonParams}):
    """
    ${paramList.map(p => `${p.name}: ${mapTypeToPython(p.type)}`).join('\n    ')}
    Returns: ${pythonReturn}
    """
    # TODO: Implement your solution here
    pass`;

    case 'javascript':
      const jsParams = paramList.map(p => p.name).join(', ');
      const jsReturn = mapTypeToJavaScript(returnType);
      
      return `/**
 * ${paramList.map(p => `@param {${mapTypeToJavaScript(p.type)}} ${p.name}`).join('\n * ')}
 * @returns {${jsReturn}}
 */
function ${function_name}(${jsParams}) {
    // TODO: Implement your solution here
    
}`;

    case 'java':
      const javaParams = paramList.map(p => `${mapTypeToJava(p.type)} ${p.name}`).join(', ');
      const javaReturn = mapTypeToJava(returnType) || 'int'; // Fallback to int if returnType is undefined
      
      // Add helpful comment only for HashMap/object return types
      const returnTypeHint = javaReturn.includes('HashMap') 
        ? `        // NOTE: You can change return type above if needed (int, int[], String, etc.)
        `
        : '';
      
      return `class Solution {
    /**
     * ${paramList.map(p => `@param ${p.name} ${mapTypeToJava(p.type)}`).join('\n     * ')}
     * @return ${javaReturn}
     */
    public ${javaReturn} ${function_name}(${javaParams}) {
${returnTypeHint}        // TODO: Implement your solution here
        
    }
}`;

    default:
      return getMinimalTemplate(language);
  }
};

// Get minimal template for language (production-ready)
const getMinimalTemplate = (language) => {
  switch (language) {
    case 'python':
      return `# Your code here`;

    case 'javascript':
      return `// Your code here`;

    case 'java':
      return `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`;

    default:
      return `// Your code here`;
  }
};

// Type mapping functions
const mapTypeToPython = (type) => {
  if (!type) return 'Any';
  const typeMap = {
    'int': 'int',
    'integer': 'int',
    'float': 'float',
    'number': 'float',
    'string': 'str',
    'bool': 'bool',
    'boolean': 'bool',
    'int[]': 'List[int]',
    'array<integer>': 'List[int]',
    'array<string>': 'List[str]',
    'array<float>': 'List[float]',
    'array': 'List',
    'object': 'Dict',
    'array<array<integer>>': 'List[List[int]]'
  };
  return typeMap[type] || 'Any';
};

const mapTypeToJavaScript = (type) => {
  if (!type) return 'any';
  const typeMap = {
    'int': 'number',
    'integer': 'number',
    'float': 'number',
    'number': 'number',
    'string': 'string',
    'bool': 'boolean',
    'boolean': 'boolean',
    'int[]': 'number[]',
    'array<integer>': 'number[]',
    'array<string>': 'string[]',
    'array<float>': 'number[]',
    'array': 'any[]',
    'object': 'object',
    'array<array<integer>>': 'number[][]'
  };
  return typeMap[type] || 'any';
};

const mapTypeToJava = (type) => {
  if (!type) return 'int';
  const typeMap = {
    'int': 'int',
    'integer': 'int',
    'float': 'double',
    'number': 'double',
    'string': 'String',
    'bool': 'boolean',
    'boolean': 'boolean',
    'int[]': 'int[]',
    'array<integer>': 'int[]',
    'array<string>': 'String[]',
    'array<float>': 'double[]',
    'array': 'int[]', // Default array type for Java
    'object': 'HashMap<String, Object>',
    'array<array<integer>>': 'int[][]',
    'void': 'void',
    'null': 'void'
  };
  
  // Handle array types more intelligently
  if (type && type.includes('[]')) {
    const baseType = type.replace('[]', '');
    const mappedBaseType = mapTypeToJava(baseType);
    return mappedBaseType + '[]';
  }
  
  return typeMap[type] || 'int'; // Default to int instead of Object
};

// Get supported languages (exclude Java for object return types)
export const getSupportedLanguages = (interfaceSpec = null) => {
  const allLanguages = [
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'java', label: 'Java', extension: 'java' }
  ];
  
  // Exclude Java if return type is 'object' (HashMap has issues with array formatting)
  const returnType = interfaceSpec?.return_type;
  if (returnType === 'object') {
    return allLanguages.filter(lang => lang.value !== 'java');
  }
  
  return allLanguages;
};
