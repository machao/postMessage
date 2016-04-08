# window postMessage plugin

基于`window.name轮询`兼容方案的postMessage 组件，支持IE6+以及现代浏览器。支持AMD和inline两种模式使用。同时增加 window.PM 访问入口。

## 依赖

为了全浏览器兼容，postMessage消息传递将被转化为 **JSON** 字符串，所以本组件引入前，必须先引入json组件，否则本组件将无效。

## API

### PM.send(target, type, data [,origin])

        发送一个跨域消息.

        target: Window|id-String|iframe (Required)
            消息目标窗口，可选值包括：iframe的字符串id、iframe的dom对象、iframe.contentWindow、其他window对象的句柄（比如window.open的返回值）

        type:String (Required)
            发送消息的类型，必须是非空字符串，区分大小写。只有类型匹配的消息才可以被接收。增加该参数是为了弥补 origin 参数的不灵活（不可设置多个url）

        data:Object (Required)
            要发送的数据，可以是任意javascript基础变量。需要JSON模块支持，进行字符串序列化操作。缺少JSON模块，本组件功能将直接失效。

        origin:String (Optional)
            指定消息发送的目标地址，或 "*"（默认）。
            传递 origin 参数后要求接收方地址必须全包含该参数的值，并且从第一个字符开始匹配，比如 "http://caipiao.163.com"。
            只有在安全性要求极高的场景才建议使用该参数。


### PM.bind(type, fn)

        绑定当前窗口的postMessage通知。

        type:String (Required)
            要接收消息的类型，必须是非空字符串，区分大小写。

        fn:Function (Required)
            消息接收函数，接受一个参数 data，即由发送方传递的data数据。


## 关于unbind

本组件不提供unbind接口以简化组件复杂度。有类似需求，请自行在handler中设置标志位来处理，或者自行分发消息通知。

## 兼容说明
-----------

postMessage的兼容情况已经非常赞了，但是只有IE是个拖油瓶，所有的兼容问题全在IE上：[Can I Use?](http://caniuse.com/#search=postMessage)

- IE6/7 不支持postMessage，通过轮询 window.name 模拟实现；
- IE8/9 仅仅支持 iframe 形式的postMessage，其他形式(tabs/windows)不支持，并且不支持 object 类型数据传递；
- IE10/11 仅仅支持 iframe 形式的postMessage，其他形式(tabs/windows)不支持。

所以：

- **限制组件使用场景为 iframe**。如果你要兼容 IE 的话；
- **模拟的postMessage有时间延迟**。window.name的设置、读取都是定时器轮询处理的。所以消息的发送以及接收都会存在一定延迟，尽管这个延迟并不大(`<=20ms`)；
- **模拟的postMessage有传输量限制**。使用模拟的 window.name 传输信息，有人测试传输量上限是 3M，即长达 3 \* 1024 \* 1024 字节，足够日常使用了。但是，当你尝试传输一个超大对象（序列化后的字符串）时，请务必确认在 IE67 下的实际效果是否正确。