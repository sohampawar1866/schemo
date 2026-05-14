import base64
import logging
from enum import Enum
from io import BytesIO

import schemdraw
import schemdraw.elements as elm
from pydantic import BaseModel, Field

logger = logging.getLogger("schemo.circuit")

class ComponentType(str, Enum):
    RESISTOR = "resistor"
    CAPACITOR = "capacitor"
    INDUCTOR = "inductor"
    DIODE = "diode"
    SOURCE_V = "source_v"
    SOURCE_I = "source_i"
    GROUND = "ground"
    LINE = "line"
    # Keeping it simple for V1 to ensure LLM accuracy.
    # Op-amps and Transistors can be added in V1.1 as they require anchor management.

class CircuitElement(BaseModel):
    type: ComponentType = Field(
        ..., 
        description="The type of the component to draw."
    )
    start: tuple[float, float] = Field(
        ..., 
        description="Starting coordinate (x, y) on a 2D grid. Example: [0, 0]"
    )
    end: tuple[float, float] | None = Field(
        default=None, 
        description="Ending coordinate (x, y) on a 2D grid. Not required for Ground. Example: [2, 0]"
    )
    label: str | None = Field(
        default=None, 
        description="Optional label or value (e.g., '10kΩ', '5V')"
    )

class CircuitInput(BaseModel):
    elements: list[CircuitElement] = Field(
        ...,
        description="List of elements that make up the circuit. The LLM must plan the layout on a coordinate grid."
    )

def _get_schemdraw_element(comp_type: ComponentType):
    """Maps our schema enum to schemdraw classes."""
    mapping = {
        ComponentType.RESISTOR: elm.Resistor,
        ComponentType.CAPACITOR: elm.Capacitor,
        ComponentType.INDUCTOR: elm.Inductor,
        ComponentType.DIODE: elm.Diode,
        ComponentType.SOURCE_V: elm.SourceV,
        ComponentType.SOURCE_I: elm.SourceI,
        ComponentType.GROUND: elm.Ground,
        ComponentType.LINE: elm.Line,
    }
    return mapping[comp_type]

def render_circuit_to_image(elements: list[CircuitElement]) -> bytes:
    """
    Renders a list of coordinate-based circuit elements into a PNG byte string.
    """
    with schemdraw.Drawing(show=False) as d:
        d.config(fontsize=12, lw=1.5)
        
        for el in elements:
            comp_class = _get_schemdraw_element(el.type)
            
            # Instantiate the element
            drawn_el = comp_class()
            
            # Position it
            drawn_el.at(el.start)
            if el.end and el.type != ComponentType.GROUND:
                drawn_el.to(el.end)
            
            # Add label if present (Ground doesn't typically get a label in this way)
            if el.label and el.type != ComponentType.GROUND:
                drawn_el.label(el.label)
                
            d += drawn_el

        # Export to PNG
        png_bytes = d.get_imagedata('png')
        
    return png_bytes

