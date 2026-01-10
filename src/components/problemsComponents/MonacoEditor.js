import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

/**
 * Monaco Editor - Simple code editor component
 * ONLY displays code - does NOT generate templates
 * Templates are generated externally by parent components
 */
const MonacoEditor = ({
  language,
  value,
  defaultValue,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
  challengeMode = false
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Challenge mode restrictions - disable copy/paste commands
    if (challengeMode) {
      // Disable copy command (Ctrl+C / Cmd+C)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        return false; // Block copy
      });

      // Disable paste command (Ctrl+V / Cmd+V)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        return false; // Block paste
      });

      // Disable Ctrl+Shift+C
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC, () => {
        return false;
      });

      // Disable context menu
      editor.onContextMenu((e) => {
        e.preventDefault();
        return false;
      });
    }

    editor.updateOptions({
      fontSize: 15,
      lineHeight: 24,
      tabSize: 2,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      fontWeight: '500',
      letterSpacing: 0.3,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'all',
      renderLineHighlightOnlyWhenFocus: false,
      ...(challengeMode && {
        contextmenu: false, // Disable context menu
        quickSuggestions: false,
        wordBasedSuggestions: 'off',
      })
    });
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: readOnly,
    cursorStyle: 'line',
    automaticLayout: true,
    fontSize: 15,
    lineHeight: 24,
    tabSize: 2,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingIndent: 'indent',
    fontWeight: '500',
    letterSpacing: 0.3,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'all',
    renderLineHighlightOnlyWhenFocus: false,
    padding: { top: 16, bottom: 16 },
    ...(challengeMode && {
      contextmenu: false,
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
    })
  };

  return (
    <div
      className="h-full w-full"
      {...(challengeMode && {
        onContextMenu: (e) => e.preventDefault()
      })}
    >
      <Editor
        height="100%"
        language={language}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={editorOptions}
      />
    </div>
  );
};

export default MonacoEditor;

