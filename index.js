/**
 * 跨浏览器支持的 postMessage 组件
 *
 * 发送一个消息
 * PM.send(target, type, data [,origin]);
 *
 * 绑定消息接收
 * PM.bind(type, fn);
 */
(function(factory) {
	if (window.define && define.amd) {
		define(["json"], factory);
	} else {
		window.PM = window.JSON ? factory(JSON) : {
			send: function() {},
			bind: function() {}
		};
	}
})(function(JSON) {
	// 不支持postMessage的用window.name模拟实现
	// 对外公开的API中的type参数是组件自己包装的
	// _PM为内部模拟对象，提供相同的接口，但不做任何参数校验
	// 仅组件内部使用
	// 在IE67中，跨域窗口window.name是只写的，不可读！！！
	var _PM = "postMessage" in window ? {
		send: function(target, data, origin) {
			target.postMessage(JSON.stringify(data), origin);
		},
		bind: function(fn) {
			var handler = function(e) {
				return fn.call(this, JSON.parse(e.data || ""));
			};
			if (window.addEventListener) {
				window.addEventListener("message", handler, false);
			} else {
				window.attachEvent("onmessage", handler);
			}
		}
	} : (function() {
		//消息监听队列
		var handlerQueue = [],
			//name前缀标志
			prefix = "PM|",
			//轮询间隔
			timeFrq = 20;
		//发送消息到指定窗口
		//为了保证消息不丢失，设置消息的频率不能高于轮询频率
		//最为完美的做法，是按照目标窗口 target 分别计算发送时间间隔
		//但实际使用中，基本都是两个窗口互为通讯，极少有多个窗口互为通讯的情况
		//所以，这里采用统一时间间隔发送消息，而不区分目标对象，以简化程序逻辑
		var msgDataQueue = [];
		var checkDataQueue = function() {
			if (msgDataQueue.timer) {
				window.clearTimeout(msgDataQueue.timer);
				delete msgDataQueue.timer;
			}
			//没有需要处理的，则停止
			if (!msgDataQueue.length) {
				return;
			}
			//时间间隔不到的，延迟处理
			var now = +new Date();
			var last = msgDataQueue.lastCheck || 0;
			if (now < last + 1.5 * timeFrq) {
				msgDataQueue.timer = window.setTimeout(checkDataQueue, last + 1.5 * timeFrq - now);
				return;
			}

			//时间间隔达到要求后，开始处理消息队列中的第一个消息
			msgDataQueue.lastCheck = now;
			var info = msgDataQueue.shift();
			info.win.name = info.msg;

			//继续
			checkDataQueue();
		};
		//轮询window.name传递过来的信息
		window.setInterval(function() {
			var name = unescape(window.name || "");
			//name值错误，则忽略
			if (name.indexOf(prefix) !== 0) {
				return;
			}
			//立刻重置name，防止多次进入处理程序
			window.name = "";

			//检查发送过来的数据，如果错误，则忽略，等待下次通知
			var msg;
			try {
				msg = JSON.parse(name.slice(prefix.length));
			} catch (e) {
				return;
			}
			if (!msg || !msg.data || !msg.origin) {
				return;
			}
			//检查origin数据，不匹配的消息直接忽略
			if (msg.origin !== "*" && location.href.toLowerCase().indexOf(msg.origin.toLowerCase()) !== 0) {
				return;
			}
			//处理消息，参数跟原生有区别
			var n = handlerQueue.length,
				i = 0;
			for (; i < n; i++) {
				try {
					handlerQueue[i].call(window, msg.data);
				} catch (e) {}
			}
		}, timeFrq);

		//返回包装的接口
		return {
			send: function(target, data, origin) {
				msgDataQueue.push({
					win: target,
					msg: escape(prefix + JSON.stringify({
						data: data,
						origin: origin
					}))
				});
				checkDataQueue();
			},
			bind: function(fn) {
				handlerQueue.push(fn);
			}
		};
	})();

	//主对象，增加参数校验、type分类
	window.PM = {
		send: function(target, type, data, origin) {
			if (!target || !type || data === undefined) {
				return;
			}
			//target可以传递iframe的id
			if (typeof target === "string") {
				if (!(target = document.getElementById(target))) {
					return;
				}
			}
			//如果传递的是iframe对象，则兼容处理其 contentWindow
			try {
				if (target.self !== target) {
					target = target.contentWindow;
				}
			} catch (e) {}
			_PM.send(target, {
				type: type,
				data: data
			}, origin || "*");
		},
		bind: function(type, fn) {
			if (!type || Object.prototype.toString.call(fn) !== "[object Function]") {
				return;
			}
			_PM.bind(function(msg) {
				if (msg.type !== type) {
					return;
				}
				fn.call(this, msg.data);
			});
		}
	};
	return window.PM;
});
