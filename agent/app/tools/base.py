from abc import ABC, abstractmethod
from typing import Any, Dict

class Tool(ABC):
    """
    Base class for all agent tools
    
    This mirrors the TypeScript Tool interface from lib/llm/tools/index.ts
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """The name of the tool"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """A description of what the tool does"""
        pass
    
    @abstractmethod
    async def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """
        Execute the tool with the given arguments
        
        Returns:
            Dict with 'success' boolean and either 'content'/'result' or 'error' fields
        """
        pass
    
    def __str__(self) -> str:
        return f"{self.name}: {self.description}"
    
    def __repr__(self) -> str:
        return f"Tool(name='{self.name}', description='{self.description}')" 