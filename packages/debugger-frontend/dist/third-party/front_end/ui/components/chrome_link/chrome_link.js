import*as e from"../../../core/common/common.js";import*as t from"../../../core/host/host.js";import*as r from"../../../core/platform/platform.js";import*as o from"../../../core/sdk/sdk.js";import*as s from"../../lit-html/lit-html.js";import*as n from"../../visual_logging/visual_logging.js";import*as i from"../helpers/helpers.js";const a=new CSSStyleSheet;a.replaceSync(".link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}\n/*# sourceURL=chromeLink.css */\n");class h extends HTMLElement{static litTagName=s.literal`devtools-chrome-link`;#e=this.attachShadow({mode:"open"});#t=this.#r.bind(this);#o="";connectedCallback(){this.#e.adoptedStyleSheets=[a],i.ScheduledRender.scheduleRender(this,this.#t)}set href(t){if(!e.ParsedURL.schemeIs(t,"chrome:"))throw new Error("ChromeLink href needs to start with 'chrome://'");this.#o=t,i.ScheduledRender.scheduleRender(this,this.#t)}#s(e){const r=o.TargetManager.TargetManager.instance().rootTarget();if(null===r)return;const s=this.#o;r.targetAgent().invoke_createTarget({url:s}).then((e=>{e.getError()&&t.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(s)})),e.consume(!0)}#r(){const e=new URL(this.#o);e.search="";const t=r.StringUtilities.toKebabCase(e.toString());s.render(s.html`
        <a href=${this.#o} class="link" target="_blank"
          jslog=${n.link().track({click:!0}).context(t)}
          @click=${this.#s}><slot></slot></a>
      `,this.#e,{host:this})}}customElements.define("devtools-chrome-link",h);var l=Object.freeze({__proto__:null,ChromeLink:h});export{l as ChromeLink};
