// 后台计算入口：消息 id 用于匹配请求与返回结果。
'use strict';
importScripts('decision.js');
self.onmessage=event=>{const {id,ids,mode}=event.data;try{self.postMessage({id,result:DecisionCore.recommend(ids,mode)});}catch(error){self.postMessage({id,error:error.message});}};
