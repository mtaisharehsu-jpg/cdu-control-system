import yaml
import time
import importlib
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class ControlEngine:
    def __init__(self, config_path):
        self.blocks = {}
        self._load_config(config_path)

    def _load_config(self, config_path):
        logging.info(f"Loading configuration from: {config_path}")
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        for block_conf in config.get('FunctionBlocks', []):
            block_id = block_conf.get('id')
            block_type = block_conf.get('type')
            
            if not block_id or not block_type:
                logging.warning(f"Skipping invalid block config: {block_conf}")
                continue

            # 動態載入並實例化 Block Class
            # 轉換 BlockType (e.g., PumpVFDBlock) to module_name (e.g., pump_vfd)
            # 簡化的映射方式
            if block_type == 'PumpVFDBlock':
                module_name = "blocks.pump_vfd"
            else:
                # 通用轉換邏輯
                type_without_block = block_type.replace('Block', '')
                import re
                module_name_snake_case = re.sub('([A-Z])', r'_\1', type_without_block).lower().lstrip('_')
                module_name = f"blocks.{module_name_snake_case}"
            class_name = block_type
            
            try:
                module = importlib.import_module(module_name)
                BlockClass = getattr(module, class_name)
                self.blocks[block_id] = BlockClass(block_id, block_conf)
                logging.info(f"Loaded Block: '{block_id}' of type '{class_name}'")
            except (ImportError, AttributeError) as e:
                logging.error(f"Error loading block '{block_id}' of type '{class_name}': {e}")

    def run(self):
        logging.info("Control Engine Started...")
        while True:
            for block_id, block in self.blocks.items():
                try:
                    block.update()
                except Exception as e:
                    logging.error(f"Error updating block '{block_id}': {e}")
            
            # 控制迴圈的頻率
            time.sleep(1) 

    # 提供給 API 層調用的接口
    def get_block_property(self, block_id, prop_name):
        if block_id in self.blocks:
            return getattr(self.blocks[block_id], prop_name, None)
        return None

    def set_block_property(self, block_id, prop_name, value):
        if block_id in self.blocks:
            logging.info(f"Setting property '{prop_name}' for block '{block_id}' to '{value}'")
            setattr(self.blocks[block_id], prop_name, value)
            return True
        logging.warning(f"Attempted to set property on non-existent block '{block_id}'")
        return False