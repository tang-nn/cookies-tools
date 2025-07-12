## 需求
将用户选择的”源标签“以及用户点击“复制 Session”、“复制 Cookies”或“复制 LocalStorage”，复制到“目标标签”的“Session”、“Cookies”或“LocalStorage”。
“源标签”是下拉款，可以选择浏览器打开的所有标签。
“目标标签””是下拉款，可以选择浏览器打开的所有标签。


## 规范
1. 修改错误时不能影响原有功能

``` json
{
  "SessionStorage":{
    key:value,
    ...
  },
  "Cookies":{
    key:value,
    ...
  },
  "LocalStorage":{
    key:value,
    ...
  }
}
```