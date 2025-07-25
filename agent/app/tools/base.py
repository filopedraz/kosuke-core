from abc import ABC
from abc import abstractmethod
from typing import Any


class Tool(ABC):
    """
    Base class for all agent tools

    This mirrors the TypeScript Tool interface from lib/llm/tools/index.ts
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """The name of the tool"""

    @property
    @abstractmethod
    def description(self) -> str:
        """A description of what the tool does"""

    @abstractmethod
    async def execute(self, *args, **kwargs) -> dict[str, Any]:
        """
        Execute the tool with the given arguments

        Returns:
            Dict with 'success' boolean and either 'content'/'result' or 'error' fields
        """

    def __str__(self) -> str:
        return f"{self.name}: {self.description}"

    def __repr__(self) -> str:
        return f"Tool(name='{self.name}', description='{self.description}')"
