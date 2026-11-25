import type {ReactNode} from 'react';
export function AuthShell({children}: {children:ReactNode}){
 return <main className="auth-page"><section className="auth-card"><a className="auth-brand" href="/"><span>PK</span>ProjectKanban</a>{children}</section><p className="auth-footnote">A shared place to move work forward.</p></main>;
}
