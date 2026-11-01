/** Retain the latest explicit verse action before React, using a server-rendered feedback node. */
export const VERSE_INTENT_SCRIPT = String.raw`(function(){
if(typeof HTMLDialogElement==="undefined"||!HTMLDialogElement.prototype.showModal)return;
var pending=null,timer=0,loading=false;
function box(){return document.getElementById("verse-intent-feedback")}
function clear(focus){clearTimeout(timer);var previous=pending;pending=null;var b=box();if(b)b.hidden=true;if(focus&&previous&&previous.isConnected)previous.focus({preventScroll:true})}
function fail(){clearTimeout(timer);loading=false;var b=box();if(b&&pending){b.children[0].hidden=true;b.children[1].hidden=false;b.querySelector("a").hidden=false}}
function start(){if(pending&&api.load&&!loading){loading=true;api.load()}}
function click(e){
if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||!(e.target instanceof Element))return;
if(e.target.closest("#verse-intent-feedback button")){e.preventDefault();e.stopPropagation();clear(true);return}
var a=e.target.closest("a[href]");if(!a||a.hasAttribute("download")||(a.target&&a.target!=="_self"))return;
var ref=a.dataset.connectionsRef||a.dataset.shareRef||a.dataset.studyRef;
if(a.dataset.connectionsRef&&ref.indexOf("ler/")===0){clear(false);return}
if(!ref||!/^(?:ler\/open-nbv\/)?[a-z0-9-]+\/[1-9]\d{0,2}\/[1-9]\d{0,2}$/.test(ref)){clear(false);return}
var b=box();if(!b)return;
e.preventDefault();e.stopPropagation();clear(false);pending=a;
b.children[0].hidden=false;b.children[1].hidden=true;var fallback=b.querySelector("a");fallback.href=a.href;fallback.hidden=true;b.hidden=false;
timer=setTimeout(fail,8000);start()
}
function key(e){if(pending&&e.key==="Escape"){e.preventDefault();e.stopPropagation();clear(true)}}
function navigate(){clear(false)}
var api=window.__bcVerse={start:start,fail:fail,ready:function(){
var a=pending;clear(false);document.removeEventListener("click",click,true);document.removeEventListener("keydown",key,true);window.removeEventListener("popstate",navigate);window.removeEventListener("pagehide",navigate);delete window.__bcVerse;
if(a&&a.isConnected)a.click()
}};
document.addEventListener("click",click,true);document.addEventListener("keydown",key,true);window.addEventListener("popstate",navigate);window.addEventListener("pagehide",navigate)
})()`;

declare global {
  interface Window {
    __bcVerse?: { load?: () => void; start: () => void; ready: () => void; fail: () => void };
  }
}
