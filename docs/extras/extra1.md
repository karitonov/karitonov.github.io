# その他の使い方

## 数式

$$
P\cdot Q = \|P\|\|Q\|\cos\alpha \tag{1}
$$

## 警告文

!!! Note
    これはノートです。

!!! Tip
    ヒントです。

!!! Warning
    これは警告です

!!! Danger
    これは危険です。

!!! Success
    これは成功です。

!!! Failure
    これは失敗です。

!!! Bug
    これはバグです。

!!! summary
    これは概要です。

## 詳細ブロック

??? Note
    これはノートです。

??? Tip
    ヒントです。

## コードフェンス

!!! Note
    ここは注釈ブロックです。

    ```yml
    markdown_extensions:
      - pymdownx.superfences
    ```

``` mermaid
graph LR
A[Start] --> B{Error?};
B -->|Yes| C[Hmm...];
C --> D[Debug];
D --> B;
B ---->|No| E[Yay!];
```
