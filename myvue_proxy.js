// 使用proxy实现响应式数据

// 实现思路
// 1. 数据代理和数据劫持
// 2. 初始化DOM  
/**
 *  showPool: [
 *    [
 *      dom,
 *      {
 *        type: if/show,
 *        show: true/false,
 *        data: 绑定的数据
 *      }
 *    ]
 *  ]
 * 
 *  eventPool [
 *    [
 *      dom,
 *      handle
 *    ]
 *  ]
 */
// 3. 初始化视图
// 4. 事件处理函数的绑定
// 5. 改变数据的同时改变dom

class MyVue {
  constructor (options) {
    const { el, data, methods } = options;

    this.el = document.querySelector(el);
    this.data= data;
    this.methods = methods;
    this.showPool = new Map();
    this.eventPool = new Map();

    this.init();
  }

  init () {
    this.initData();
    this.initDom(this.el);
    this.initView(this.showPool);
    this.initEvent(this.eventPool);
  }

  // 1. 数据代理和数据劫持
  initData () {
    const _this = this;
    this.data = new Proxy(this.data, {
      get (target, key) {
        return Reflect.get(target, key);
      },
      set (target, key, value) {
        const res =  Reflect.set(target, key, value);
        // 改变视图
        _this.domChange(key, _this.showPool);
        return res;
      }
    });
  }

  // 2. 初始化DOM
  initDom (el) {
    const _childNodes = el.childNodes;
    // 如果没有子节点，中断执行
    if (!_childNodes.length) {
      return;
    }

    _childNodes.forEach(dom => {
      // 如果是元素节点
      if (dom.nodeType === 1) {
        // v-if指令绑定的变量名
        const vIf = dom.getAttribute('v-if');
        // v-show指令绑定的变量名
        const vShow = dom.getAttribute('v-show');
        // @click指令绑定的事件处理函数名
        const vEvent = dom.getAttribute('@click');
        
        if (vIf) {
          this.showPool.set(dom, {
            type: 'if',
            show: this.data[vIf],
            data: vIf
          });
        } else if (vShow) {
          this.showPool.set(dom, {
            type: 'show',
            show: this.data[vShow],
            data: vShow
          });
        }

        if (vEvent) {
          this.eventPool.set(dom, this.methods[vEvent])
        }
      }
      // 递归
      this.initDom(dom);
    });
  }

  // 3. 初始化视图
  initView (showPool) {
    this.domChange(null, showPool);
  }
  // 改变视图
  domChange (data, showPool) {
    // 如果data不存在，说明是首次执行的初始化操作，只会走一次
    if (!data) {
      for (let [key, value] of showPool) {
        // 此处的key的值为dom
        switch (value.type) {
          case 'if':
            // 创建一个注释节点来进行占位，好用来替换
            value.comment = document.createComment('v-if');
            // 如果show的值为false，将当前dom替换成注释节点
            !value.show && key.parentNode.replaceChild(value.comment, key);
            break;
          case 'show':
            // 如果show的值为false，将当前dom的进行隐藏
            !value.show && (key.style.display = 'none');
            break;
          default:
            break;
        }
      }

      return;
    }

    for (let [key, value] of showPool) {
      // 此处的data是v-if/show指令绑定的变量名
      if (value.data === data) {
        switch (value.type) {
          case 'if':
            // 改变show的值
            value.show = !value.show
            // 如果show为true，恢复当前dom，反之将当前dom替换为注释节点
            value.show ? value.comment.parentNode.replaceChild(key, value.comment)
                       : key.parentNode.replaceChild(value.comment, key);
            break;
          case 'show':
            // 改变show的值
            value.show = !value.show
            // 如果show的值为true，将显示当前dom，否者隐藏
            value.show ? key.style.display = 'block'
                       : key.style.display = 'none';
            break;
          default:
            break;
        }
      }
    }
  }

  // 4. 事件处理函数的绑定
  initEvent (eventPool) {
    for (let [key, value] of eventPool) {
      key.addEventListener('click', value.bind(this), false);
    }
  }
}
