import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};

const resetLocalData=()=>{
  try{localStorage.removeItem('threadline-v1')}catch{}
  window.location.reload();
};

export default class ErrorBoundary extends Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError():State{return {failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Threadline UI error',error,info)}
  render(){
    if(!this.state.failed)return this.props.children;
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#f5f2ea',color:'#24251f',fontFamily:'Inter,system-ui,sans-serif'}}><section style={{maxWidth:'540px',textAlign:'center'}}><div style={{fontSize:'40px',marginBottom:'14px'}}>t</div><h1 style={{margin:'0 0 10px'}}>Threadline couldn’t render this workspace.</h1><p style={{opacity:.72,lineHeight:1.6}}>Reload first. If damaged browser data is causing the failure, reset only Threadline’s local demo conversations and reopen a clean workspace.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginTop:'14px'}}><button onClick={()=>window.location.reload()} style={{border:0,borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer',background:'#252820',color:'#fff'}}>Reload Threadline</button><button onClick={resetLocalData} style={{border:'1px solid #b8b3a8',borderRadius:'10px',padding:'11px 16px',fontWeight:700,cursor:'pointer',background:'transparent',color:'#24251f'}}>Reset local demo data</button></div></section></main>;
  }
}
