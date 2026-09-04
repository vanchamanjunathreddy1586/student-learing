from collections.abc import Iterator

def sse_chunks(chunks: Iterator[str]):
    for chunk in chunks:
        yield f"data: {chunk}\n\n"
    yield "data: [DONE]\n\n"