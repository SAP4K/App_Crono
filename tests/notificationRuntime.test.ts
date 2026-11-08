import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('native notification loading distinguishes Expo Go from embedded release and development clients', () => {
  for (const runtime of ['bare', 'standalone', 'development-client', 'expo-go']) for (const embedded of [true, false]) {
    const environment = runtime === 'bare' || runtime === 'standalone' ? runtime : 'storeClient';
    const expoGo = runtime === 'expo-go';
    const script = `
      import assert from 'node:assert/strict';
      import { registerHooks } from 'node:module';
      import { existsSync } from 'node:fs';
      globalThis.notificationImports = 0;
      const mocks = {
        'expo': ${JSON.stringify(`export const isRunningInExpoGo=()=>${expoGo};`)},
        'expo-constants': ${JSON.stringify(`export default { executionEnvironment: ${JSON.stringify(environment)}, expoGoConfig: ${embedded ? '{}' : 'null'} }; export const ExecutionEnvironment = { StoreClient: 'storeClient' };`)},
        'react-native': "export const Platform={OS:'android',Version:31}; export const Linking={openSettings:async()=>{}};",
        './backgroundAccess': "export async function backgroundAccess(){return {exactAlarm:'granted',battery:'optimized'}}",
        './appActivity': "export const isAppActive=()=>true;",
        'expo-notifications': "globalThis.notificationImports++; export function setNotificationHandler(){}; export async function getPermissionsAsync(){return {status:'granted',granted:true,canAskAgain:false}};",
      };
      registerHooks({resolve(specifier,context,next){
        if(mocks[specifier]) return {url:'data:text/javascript,'+encodeURIComponent(mocks[specifier]),shortCircuit:true};
        if(specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
          for(const suffix of ['.ts','/index.ts']) {
            const path=new URL(specifier+suffix,context.parentURL);
            if(existsSync(path)) return next(path.href,context);
          }
        }
        return next(specifier,context);
      }});
      const {systemNotifications}=await import(${JSON.stringify(new URL('../src/hooks/systemNotifications.ts', import.meta.url).href)});
      const capability=await systemNotifications.permission();
      assert.equal(capability.canSchedule,${!expoGo});
      assert.equal(globalThis.notificationImports,${expoGo ? 0 : 1});
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${runtime}, embedded=${embedded}: ${result.stderr}`);
  }
});

for (const boundary of ['android-channels', 'android-permission', 'ios-permission']) {
  for (const action of ['home', 'opt-out', 'dispose', 'failed-hydration', 'active']) {
    test(`permission request after ${boundary} respects ${action}, coalescing and later retries`, () => {
      const platform = boundary.startsWith('android') ? 'android' : 'ios';
      const script = `
        import assert from 'node:assert/strict';
        import { registerHooks } from 'node:module';
        import { existsSync } from 'node:fs';
        const boundary=${JSON.stringify(boundary)}, action=${JSON.stringify(action)}, platform=${JSON.stringify(platform)};
        let enter, release, held=false, reads=0;
        const entered=new Promise(resolve=>{enter=resolve});
        const gate=new Promise(resolve=>{release=resolve});
        const denied={status:'denied',granted:false,canAskAgain:true};
        let permission=platform==='ios'?{status:'undetermined',granted:false,canAskAgain:true,
          ios:{status:0,allowsAlert:null,allowsSound:null,allowsDisplayOnLockScreen:null}}:denied;
        const warnings=[], prompts=[];
        let active=true, hydration='loaded', data;
        globalThis.qaActive=()=>active;
        globalThis.qaHold=async()=>{if(!held){held=true;enter();await gate}};
        globalThis.qaPermission=async()=>{
          if(++reads===2 && boundary.endsWith('permission')) await globalThis.qaHold();
          return permission;
        };
        globalThis.qaPrompt=async()=>{
          prompts.push({active,hydration,enabled:data.preferences.systemNotifications});
          if(platform==='ios') permission={status:'denied',granted:false,canAskAgain:false,
            ios:{status:1,allowsAlert:false,allowsSound:false,allowsDisplayOnLockScreen:false}};
          return permission;
        };
        const mocks={
          'expo':'export const isRunningInExpoGo=()=>false;',
          'expo-constants':'export default {};',
          'react-native':${JSON.stringify(`export const Platform={OS:'${platform}',Version:33}; export const Linking={openSettings:async()=>{}};`)},
          './appActivity':'export const isAppActive=()=>globalThis.qaActive();',
          './backgroundAccess':"export async function backgroundAccess(){return {exactAlarm:'granted',battery:'optimized'}}",
          'expo-notifications':
            "export const AndroidImportance={HIGH:6}; export const AndroidNotificationVisibility={PRIVATE:0};"+
            "export function setNotificationHandler(){};"+
            "export const getPermissionsAsync=globalThis.qaPermission;"+
            "export const requestPermissionsAsync=globalThis.qaPrompt;"+
            "export async function setNotificationChannelAsync(){"+
              (boundary==='android-channels'?'await globalThis.qaHold();':'')+"};"+
            "export async function getAllScheduledNotificationsAsync(){return []};"+
            "export async function getPresentedNotificationsAsync(){return []};",
        };
        registerHooks({resolve(specifier,context,next){
          if(mocks[specifier]) return {url:'data:text/javascript,'+encodeURIComponent(mocks[specifier]),shortCircuit:true};
          if(specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
            for(const suffix of ['.ts','/index.ts']) {
              const path=new URL(specifier+suffix,context.parentURL);
              if(existsSync(path)) return next(path.href,context);
            }
          }
          return next(specifier,context);
        }});
        const {systemNotifications}=await import(${JSON.stringify(new URL('../src/hooks/systemNotifications.ts', import.meta.url).href)});
        const {createNotificationCoordinator}=await import(${JSON.stringify(new URL('../src/hooks/notificationCoordinator.ts', import.meta.url).href)});
        const {initialData}=await import(${JSON.stringify(new URL('../src/core/stopwatch.ts', import.meta.url).href)});
        data=initialData();
        const saved=JSON.stringify(data);
        const controller=createNotificationCoordinator({getSnapshot:()=>data,getHydration:()=>hydration,
          native:systemNotifications,now:Date.now,createId:()=> 'permission-test',isActive:()=>active,
          changed:()=>{},warn:operation=>warnings.push(operation)});
        const first=controller.requestPermission(), overlapping=controller.requestPermission();
        await entered;
        if(action==='home') active=false;
        if(action==='opt-out') data={...data,preferences:{...data.preferences,systemNotifications:false}};
        if(action==='dispose') controller.dispose();
        if(action==='failed-hydration') hydration='failed';
        release();
        await Promise.all([first,overlapping]);
        assert.equal(prompts.length,action==='active'?1:0,'obsolete requests must not invoke the native permission API');
        active=true; hydration='loaded';
        data={...data,preferences:{...data.preferences,systemNotifications:true}};
        if(action==='dispose') controller.activate();
        await controller.requestPermission();
        assert.equal(prompts.length,1,'cancellation must not be treated as a refusal');
        await controller.requestPermission();
        assert.equal(prompts.length,1,'an actual refusal suppresses repeated implicit prompts');
        await controller.requestPermission(true);
        assert.equal(prompts.length,platform==='ios'?1:2,'explicit retry follows OS requestability');
        assert.ok(prompts.every(value=>value.active && value.hydration==='loaded' && value.enabled));
        assert.deepEqual(warnings,[],'cancellation is not a native error');
        assert.equal(JSON.stringify(data),saved,'permission work must not change saved clocks or preferences');
      `;
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 0, `${boundary}, ${action}: ${result.stderr || result.error?.message}`);
    });
  }
}
