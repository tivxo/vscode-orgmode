import {window, workspace, commands, Disposable, ExtensionContext, TextDocument, TextLine, Range, Position} from 'vscode';

export function activate(ctx: ExtensionContext) {

    console.log('Congratulations, your extension "OrgMode" is now active!');
    
    let orgmode = new OrgMode();

	ctx.subscriptions.push(commands.registerCommand('orgmode.navigate', () => {
		orgmode.navigate();
	}));

	ctx.subscriptions.push(commands.registerCommand('orgmode.expand', () => {
		orgmode.expand();
	}));
    
    ctx.subscriptions.push(orgmode);
}

export class OrgMode {
    private editor = window.activeTextEditor;
    private doc = this.editor.document;

    public navigate() {
        // TODO: Is language check even necessary if language is part of activation event for the extension?
        if (this.doc.languageId === 'orgmode') {
            const selection = this.editor.selection;
            let checkbox = this.findCheckbox(this.doc.lineAt(selection.active.line), selection.active);
            if (checkbox) {
                this.toggleCheckbox(checkbox);
                return;
            } 
            // Test for summary [/] element and update it.
            let summary = this.findSummary(this.doc.lineAt(selection.active.line), selection.active);
            if (summary) {
                // TODO: Walk immediate children, calculate total number and a number of checked items.
                this.updateSummary(summary, 3, 12);
                return;
            }
            // TODO: Test for reference {} or {{}} element and navigate.
            // TODO: Test for link element [[]] and open browser with the specified link.

            // Fallback to just editing text, i.e. process `enter` key.
            // TODO: Figure out keybinding and process the key depending on what default keybinding it has.
            this.editor.edit((editBuilder) => {
                // The following will translate to proper line ending automatically.
                editBuilder.insert(selection.active, '\n');
            });
        }
    }
    
    // Find first checkbox pattern on the specified line.
    // If not found or position is provided and does not end up on the found checkbox return null.
    private findCheckbox(line: TextLine, position: Position): Range {
        let re = new RegExp(`(\\[[xX ]\\])`);
        let match = re.exec(line.text);
        if (match) {
            let range = new Range(new Position(line.lineNumber, match.index + 1), new Position(line.lineNumber, match.index + 2));
            if (position && range.contains(position))
                return range;
        }
        return null;
    }
    
    private findSummary(line: TextLine, position: Position): Range {
        let re = new RegExp(`(\\[\\d*/\\d*\\])`);
        let match = re.exec(line.text);
        if (match) {
            let range = new Range(new Position(line.lineNumber, match.index + 1), new Position(line.lineNumber, match.index + match[1].length - 1));
            if (position && range.contains(position))
                return range;
        }
        return null;
    }
    
    // Perform the toggle.  'x' or 'X' becomes blank and blank becomes 'X'.
    private toggleCheckbox(checkbox: Range) {
        this.editor.edit((editBuilder) => {
            editBuilder.replace(checkbox, (this.doc.getText(checkbox) == ' ') ? 'X' : ' ');
        });
        // TODO: Update any summaries up-level and down-level.
    }
    
    private updateSummary(summary: Range, checked: number, total: number) {
        this.editor.edit((editBuilder) => {
            editBuilder.replace(summary, checked.toString() + '/' + total.toString());
        });
    }
    
    // Calculate and return indentation level of the line.  Used in traversing nested lists and locating parent item.
    private getIndent(line: TextLine): number {
        let re = new RegExp(`^(\\s*)\\S`);
        let match = re.exec(line.text);
        if (match) {
            // TODO: Convert tabs to spaces?
            return match[1].length;
        }
        return 0;
    }
    
    // Find parent item by walking lines up to the start of the file looking for a smaller indentation.  Does not ignore blank lines (indentation 0).
    private findParent(line: TextLine): TextLine {
        let lnum = line.lineNumber;
        let indent = this.getIndent(line);
        let parent = null;
        let pindent = indent;
        while (pindent >= indent) {
            lnum--;
            if (lnum <= 0) {
                return null;
            }
            
            parent = this.doc.lineAt(lnum);
            pindent = this.getIndent(parent);
        }
        return parent;
    }
    
    // Find parent item by walking lines up to the start of the file looking for a smaller indentation.  Does not ignore blank lines (indentation 0).
    private findChildren(line: TextLine): TextLine[] {
        let children = new Array();
        let lnum = line.lineNumber;
        let indent = this.getIndent(line);
        let child = null;
        let cindent = indent;
        let next_indent = 0;
        while (lnum < this.doc.lineCount) {
            lnum++;
            child = this.doc.lineAt(lnum);
            cindent = this.getIndent(child);
            if (cindent <= indent) {
                break;
            }
            if (next_indent < indent) {
                next_indent = cindent;
            }
            // TODO: Handle weird indentation like this:
            //     current
            //         child 1
            //       child 2
            //         child 3
            // Are all the above children considered siblings?
            if (cindent <= next_indent) {
                children.push(child);
            }
        }
        return children;
    }
    
    public expand() {
        let doc = this.editor.document;
        if (doc.languageId === 'orgmode') {
            console.log('Expanding...');
        }
    }
    
    public dispose() {
        // Nothing to do yet.
    }
}