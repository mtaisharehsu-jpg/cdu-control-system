class BaseBlock:
    """
    所有功能區塊 (Function Block) 的基礎類別。
    定義了所有 Block 都必須具備的共同介面。
    """
    def __init__(self, block_id, config):
        self.id = block_id
        self.config = config
    
    def update(self):
        """
        主迴圈會調用此方法來更新 Block 內部狀態及與硬體的互動。
        子類別必須實作此方法。
        """
        raise NotImplementedError
    
    def connect_inputs(self, all_blocks):
        """
        此方法用於在所有 Block 都被實例化後，
        將不同 Block 之間的輸入輸出連接起來。
        (本範例中暫未使用，但為複雜邏輯預留)
        """
        pass