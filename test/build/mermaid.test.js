/**
 * Mermaid diagram tests
 * Tests mermaid rendering in .md and .mdoc files
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

describe('Mermaid Diagrams', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should render mermaid diagrams in .md files', async () => {
    const paths = getTestPaths('mermaid-md', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'diagram.md': `# Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

This is a flowchart diagram.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'diagram/index.html'), 'utf-8')

    assert.ok(html.includes('<pre class="mermaid">'), 'Should have mermaid pre element')
    assert.ok(html.includes('graph TD'), 'Should include mermaid diagram code')
    assert.ok(html.includes('A[Start]'), 'Should include diagram nodes')
    assert.ok(html.includes('B[Process]'), 'Should include diagram nodes')
    assert.ok(html.includes('C[End]'), 'Should include diagram nodes')
  })

  it('should render mermaid diagrams in .mdoc files', async () => {
    const paths = getTestPaths('mermaid-mdoc', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'about.md': '# About\n\nRegular markdown page',
      'sequence.mdoc': `# Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice
\`\`\`

This file uses the .mdoc extension directly.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const workspaceFile = join(paths.workspace, 'sequence.mdoc')
    assert.ok(readFileSync(workspaceFile, 'utf-8'), 'Should convert to .mdoc')

    const html = readFileSync(join(paths.dist, 'sequence/index.html'), 'utf-8')

    assert.ok(html.includes('<pre class="mermaid">'), 'Should have mermaid pre element in .mdoc')
    assert.ok(html.includes('sequenceDiagram'), 'Should include sequence diagram code')
    assert.ok(html.includes('Alice->>Bob'), 'Should include sequence interactions')
    assert.ok(html.includes('Bob-->>Alice'), 'Should include sequence responses')
  })

  it('should handle multiple mermaid diagrams in one file', async () => {
    const paths = getTestPaths('mermaid-multiple', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'multi.md': `# Multiple Diagrams

## Flow Chart

\`\`\`mermaid
graph LR
    Start --> End
\`\`\`

## Pie Chart

\`\`\`mermaid
pie title Pets
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`

Two different diagram types.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'multi/index.html'), 'utf-8')

    const mermaidMatches = html.match(/<pre class="mermaid">/g)
    assert.ok(mermaidMatches, 'Should have mermaid elements')
    assert.strictEqual(mermaidMatches.length, 2, 'Should have 2 mermaid diagrams')

    assert.ok(html.includes('graph LR'), 'Should include flowchart')
    assert.ok(html.includes('pie title Pets'), 'Should include pie chart')
  })

  it('should handle mermaid with other code blocks', async () => {
    const paths = getTestPaths('mermaid-mixed', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'mixed.md': `# Mixed Code Blocks

Regular code:

\`\`\`javascript
const x = 42
console.log(x)
\`\`\`

Mermaid diagram:

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

More code:

\`\`\`python
def greet():
    return "hello"
\`\`\``,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'mixed/index.html'), 'utf-8')

    assert.ok(html.includes('<pre class="mermaid">'), 'Should have mermaid element')
    assert.ok(html.includes('graph TD'), 'Should include mermaid code')

    assert.ok(html.includes('const x = 42'), 'Should include JavaScript code')
    assert.ok(html.includes('def greet'), 'Should include Python code')

    const mermaidPre = html.match(/<pre class="mermaid">[\s\S]*?<\/pre>/)[0]
    assert.ok(!mermaidPre.includes('<code'), 'Mermaid should not have code element inside')
  })

  it('should preserve mermaid syntax in processed files', async () => {
    const paths = getTestPaths('mermaid-syntax', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'syntax.md': `# Complex Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\``,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'syntax/index.html'), 'utf-8')

    assert.ok(html.includes('stateDiagram-v2'), 'Should preserve diagram type')
    assert.ok(html.includes('[*] --> Still'), 'Should preserve state transitions')
    assert.ok(html.includes('Moving --> Crash'), 'Should preserve all transitions')
  })
})
