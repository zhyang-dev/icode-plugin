import { JSDOM } from 'jsdom';
import mermaid from 'mermaid';

// 创建 DOM 环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

// 设置全局对象
global.window = dom.window;
global.document = dom.window.document;
global.self = global;
global.global = global;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: false,
    configurable: true
});

// Mock DOMPurify
const dompurifyMock = {
    sanitize: (html) => String(html),
    addHook: () => {},
    removeHook: () => {},
    removeAllHooks: () => {}
};
dom.window.DOMPurify = dompurifyMock;
global.DOMPurify = dompurifyMock;
global.window.DOMPurify = dompurifyMock;

// 初始化 Mermaid
mermaid.initialize({
    startOnLoad: false,
    suppressErrorRendering: true,
    logLevel: 'error',
    securityLevel: 'loose',
});

// 测试图表
const diagrams = [
    {
        name: 'Class Diagram (类型体系)',
        code: `classDiagram
    class TensorBase {
        <<abstract>>
        +Shape shape
        +DeviceType device
        +Allocate()
        +Deallocate()
        +Read()
        +Write()
    }

    class TensorOwned {
        +Memory data
        +~TensorOwned() 自动释放
        +Allocate() 自动调用
    }

    class TensorView {
        -raw pointer
        -std::shared_ptr~Owner~ 追踪
        +IsValid() bool
    }

    class Tensor {
        智能指针包装
        支持RAII
        隐式转换到TensorView
    }

    class Vector {
        使用Tensor~1, Real~实现
        保留Mesh集成
    }

    TensorBase <|-- TensorOwned
    TensorBase <|-- TensorView
    TensorOwned *-- Memory
    Tensor o-- TensorOwned
    TensorView ..> TensorOwned : 可选追踪
    Tensor ..|> Vector : 特化

    style Tensor fill:#9f9,stroke:#333
    style TensorOwned fill:#f99,stroke:#333
    style TensorView fill:#99f,stroke:#333`
    },
    {
        name: 'Gantt Chart (迁移时间线)',
        code: `gantt
    title 重构迁移时间线
    dateFormat  YYYY-MM-DD
    section 第一阶段
    引入新类型定义           :a1, 2025-02-01, 2w
    实现Tensor RAII包装      :a2, after a1, 3w
    实现TensorView           :a3, after a1, 2w

    section 第二阶段
    重构Vector基于Tensor     :b1, after a2, 3w
    更新现有测试用例         :b2, after b1, 2w

    section 第三阶段
    性能优化与基准测试       :c1, after b2, 2w
    文档更新                 :c2, after c1, 1w
    代码审查与合并           :c3, after c2, 1w`
    }
];

async function testDiagrams() {
    console.log('开始验证 Mermaid 图表...\n');
    
    for (const diagram of diagrams) {
        try {
            await mermaid.parse(diagram.code);
            console.log(`✅ ${diagram.name} - 通过`);
        } catch (error) {
            console.log(`❌ ${diagram.name} - 失败`);
            console.log(`   错误: ${error.message}\n`);
        }
    }
}

testDiagrams().then(() => {
    console.log('\n验证完成!');
    process.exit(0);
}).catch(err => {
    console.error('执行错误:', err);
    process.exit(1);
});
