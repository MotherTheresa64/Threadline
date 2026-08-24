import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};

export default class ErrorBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Threadline UI error',error,info)}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#f5f2ea',color:'#24251f',fontFamily:'Inter,system-ui,sans-serif'}}><section style={{maxWidth:'520px',textAlign:'center'}}><div style={{fontSize:'40px',marginBottom:'14px'}}>t</div><h1 style={{margin:'0 0 10px'}}>Threadline couldn’t render this workspace.</h1><p style={{opacity:.72,lineHeight:1.6}}>Your locally saved conversations have not been cleared. Reload to restore the interface.</p><button onClick={()=>window.location.reload()} style={{marginTop:'14px',border:0,borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer',background:'#252820',color:'#fff'}}>Reload Threadline</button></section></main>;
  }
}
